import express from "express";
import path from "path";
import crypto from "crypto";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = 3000;

const isProd = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// SECURITY HEADERS
// CSP is enabled in production with strict directives.
// In dev mode, Vite HMR requires relaxed connect-src and script-src.
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com"],
      connectSrc: [
        "'self'",
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "https://*.firebaseapp.com",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://api.cloudinary.com",
        "wss://*.firebaseio.com",
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProd ? [] : undefined,
    },
  } : false, // Relaxed in dev to allow Vite HMR
  crossOriginEmbedderPolicy: false,
}));

// ---------------------------------------------------------------------------
// CORS – locked to configured origin(s)
// ---------------------------------------------------------------------------
const allowedOrigins = [
  process.env.APP_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://choir360x.web.app",
  "https://choir360x.firebaseapp.com",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin (no Origin header) or configured origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
}));

app.use(express.json({ limit: "512kb" })); // Tighter limit – 1mb is excessive for this API

// ---------------------------------------------------------------------------
// HEALTH CHECK – used by Render's healthCheckPath
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "choir360-backend", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// RATE LIMITERS
// IP-based limiters are the outer gate; per-user limits enforce fairness.
// ---------------------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 80,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment." },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "AI rate limit reached. Please wait before sending another message." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Upload rate limit reached. Please wait before uploading again." },
});

// Per-user AI limiter: prevents a single authenticated account from
// exhausting the Gemini quota even if using multiple IPs / proxies.
const perUserAiRequests = new Map<string, { count: number; resetAt: number }>();

function requireUserAiQuota(req: express.Request, res: express.Response, next: express.NextFunction) {
  const uid = (req as any).user?.uid;
  if (!uid) return next(); // Auth already checked upstream; skip if somehow missing

  const windowMs = 60_000;
  const limit = 15;
  const now = Date.now();

  const entry = perUserAiRequests.get(uid);
  if (!entry || now > entry.resetAt) {
    perUserAiRequests.set(uid, { count: 1, resetAt: now + windowMs });
    return next();
  }
  if (entry.count >= limit) {
    return res.status(429).json({ error: `AI quota exceeded (${limit} requests/min per user).` });
  }
  entry.count++;
  return next();
}

// Periodically purge stale per-user entries (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [uid, entry] of perUserAiRequests.entries()) {
    if (now > entry.resetAt) perUserAiRequests.delete(uid);
  }
}, 5 * 60_000);

app.use("/api", apiLimiter);

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

if (admin.apps.length === 0) {
  // On real GCP infra (Cloud Run/Functions) implicit service-identity credentials
  // are available and projectId alone is enough. On non-GCP hosts (Render, Railway,
  // a VM, etc.) there is no implicit credential, so verifyIdToken()/Firestore calls
  // silently fail unless we explicitly build a credential from the service account
  // JSON. Prefer the explicit credential whenever it's provided.
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson && serviceAccountJson.trim()) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || firebaseProjectId,
      });
      console.log("[Choir360 X] Firebase Admin initialized with explicit service account credentials.");
    } catch (error: any) {
      console.error("[Choir360 X] FIREBASE_SERVICE_ACCOUNT_JSON is set but could not be parsed:", error?.message || error);
    }
  } else if (firebaseProjectId) {
    // Falls back to Application Default Credentials (works on real GCP runtimes
    // or local dev after `gcloud auth application-default login`).
    admin.initializeApp({ projectId: firebaseProjectId });
    console.log("[Choir360 X] Firebase Admin initialized with projectId only (relying on ADC) — set FIREBASE_SERVICE_ACCOUNT_JSON for non-GCP hosts.");
  }
}

async function requireFirebaseAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!admin.apps.length) {
    return res.status(503).json({ error: "Firebase Admin is not configured on the server." });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!token) {
    return res.status(401).json({ error: "Missing Firebase ID token." });
  }

  try {
    (req as any).user = await admin.auth().verifyIdToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid Firebase ID token." });
  }
}

function requireAdminRole(req: express.Request, res: express.Response, next: express.NextFunction) {
  const role = (req as any).user?.role;
  if (!["super_admin", "diocese_admin", "parish_admin", "choir_admin"].includes(role)) {
    return res.status(403).json({ error: "Admin role is required to sync readings." });
  }
  return next();
}

function requireString(value: unknown, field: string, maxLength = 500) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${field} is required and must be under ${maxLength} characters.`);
  }
  return value.trim();
}

// ---------------------------------------------------------------------------
// ONE-TIME ADMIN BOOTSTRAP
// Solves the chicken-and-egg problem of granting the very first super_admin:
// every other admin action requires requireAdminRole, which requires a role
// that doesn't exist yet. Gated by a secret (not a user role) instead.
//
// Usage: set ADMIN_BOOTSTRAP_SECRET on the server once, call this endpoint
// for the account that should become super_admin, then REMOVE the env var
// (or rotate it) — leaving it set is a standing privilege-escalation risk.
// ---------------------------------------------------------------------------
app.post("/api/admin/bootstrap-super-admin", async (req, res) => {
  try {
    const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!configuredSecret || !configuredSecret.trim()) {
      return res.status(503).json({ error: "ADMIN_BOOTSTRAP_SECRET is not configured on this server." });
    }
    if (!admin.apps.length) {
      return res.status(503).json({ error: "Firebase Admin is not configured on this server." });
    }

    const email = requireString(req.body?.email, "email", 200);
    const secret = requireString(req.body?.secret, "secret", 200);

    if (secret !== configuredSecret) {
      return res.status(403).json({ error: "Invalid bootstrap secret." });
    }

    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, {
      role: "super_admin",
      tenantId: "global",
      parishId: "st-thomas-cathedral",
      choirId: "st-thomas-cathedral-choir",
    });

    return res.json({
      message: `super_admin granted to ${email}. Remove ADMIN_BOOTSTRAP_SECRET from the server env now.`,
      uid: user.uid,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Bootstrap failed." });
  }
});

type BibleLanguage = "ta" | "en";

interface ReadingSection {
  heading: string;
  reference?: string;
  text: string;
}

interface DailyReadingRecord {
  id: string;
  date: string;
  language: BibleLanguage;
  title: string;
  liturgicalDay: string;
  firstReading?: ReadingSection;
  psalm?: ReadingSection;
  secondReading?: ReadingSection;
  gospelAcclamation?: ReadingSection;
  gospel?: ReadingSection;
  reflection?: ReadingSection;
  feast?: string;
  saint?: string;
  liturgicalColor?: string;
  sourceUrl: string;
  publicDisplay: boolean;
  lastSyncedAt: string;
  syncStatus: "synced" | "cached" | "failed" | "pending";
  syncMessage?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  status: string;
  tenantId: string;
  parishId: string;
  choirId: string;
}

const ARULVAKKU_CALENDAR_URL = "https://www.arulvakku.com/calendar.php";
const DEFAULT_TENANT_CONTEXT = {
  tenantId: "demo-tenant",
  parishId: "st-thomas-cathedral",
  choirId: "cathedral-choir",
};

function getDateInIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeReadingDate(value: unknown) {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getDateInIndia();
  return date;
}

function normalizeReadingLanguage(value: unknown): BibleLanguage {
  return value === "en" ? "en" : "ta";
}

function getReadingDocId(date: string, language: BibleLanguage) {
  return language === "ta" ? date : `${date}_${language}`;
}

function stripCatholicHtmlToText(html: string) {
  return decodeHtmlEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " "))
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function findFirstIndex(text: string, aliases: string[], fromIndex = 0) {
  return aliases
    .map((alias) => ({ alias, index: text.indexOf(alias, fromIndex) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)[0] ?? null;
}

function extractReadingSection(text: string, headings: string[], stopHeadings: string[]): ReadingSection | undefined {
  const start = findFirstIndex(text, headings);
  if (!start) return undefined;

  const contentStart = start.index + start.alias.length;
  const stop = findFirstIndex(text, stopHeadings, contentStart);
  const rawContent = text.slice(contentStart, stop ? stop.index : text.length).trim();
  const lines = rawContent.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return undefined;

  const referenceLineIndex = lines.findIndex((line) =>
    /(\d+\s*[:.]\s*\d+|நூலிலிருந்து வாசகம்|எழுதிய தூய நற்செய்தியிலிருந்து|Psalm|Psalms?|Reading from|Gospel according)/i.test(line)
  );
  const reference = referenceLineIndex >= 0 ? lines[referenceLineIndex] : undefined;
  const textLines = lines.filter((_, index) => index !== referenceLineIndex);

  return {
    heading: start.alias,
    reference,
    text: textLines.join("\n"),
  };
}

function parseArulvakkuReadings(html: string, date: string, language: BibleLanguage, publicDisplay: boolean): DailyReadingRecord {
  const text = stripHtmlToText(html);
  const titleMatch = text.match(/\d{1,2}\s+[^\n,]+(?:\s+\d{4})?,\s*[^\n]+/);
  const liturgicalDayMatch = text.match(/(?:####\s*)?([^\n]*(?:காலம்|வாரம்|திருநாள்|பெருவிழா|ஞாயிறு|வெள்ளி|சனி|திங்கள்|செவ்வாய்|புதன்|வியாழன்)[^\n]*)/);
  const now = new Date().toISOString();

  const allHeadings = [
    "முதல் வாசகம்",
    "பதிலுரைப் பாடல்",
    "இரண்டாம் வாசகம்",
    "நற்செய்திக்கு முன் வசனம்",
    "நற்செய்திக்கு முன் வாழ்த்தொலி",
    "நற்செய்தி வாசகம்",
    "சிந்தனை",
    "வாசகங்கள்",
    "First Reading",
    "Responsorial Psalm",
    "Second Reading",
    "Gospel Acclamation",
    "Gospel",
    "Reflection",
  ];

  const firstReading = extractReadingSection(text, ["முதல் வாசகம்", "First Reading"], allHeadings.filter((heading) => !["முதல் வாசகம்", "First Reading"].includes(heading)));
  const psalm = extractReadingSection(text, ["பதிலுரைப் பாடல்", "Responsorial Psalm"], allHeadings.filter((heading) => !["பதிலுரைப் பாடல்", "Responsorial Psalm"].includes(heading)));
  const secondReading = extractReadingSection(text, ["இரண்டாம் வாசகம்", "Second Reading"], allHeadings.filter((heading) => !["இரண்டாம் வாசகம்", "Second Reading"].includes(heading)));
  const gospelAcclamation = extractReadingSection(text, ["நற்செய்திக்கு முன் வசனம்", "நற்செய்திக்கு முன் வாழ்த்தொலி", "Gospel Acclamation"], allHeadings.filter((heading) => !["நற்செய்திக்கு முன் வசனம்", "நற்செய்திக்கு முன் வாழ்த்தொலி", "Gospel Acclamation"].includes(heading)));
  const gospel = extractReadingSection(text, ["நற்செய்தி வாசகம்", "Gospel"], allHeadings.filter((heading) => !["நற்செய்தி வாசகம்", "Gospel"].includes(heading)));
  const reflection = extractReadingSection(text, ["சிந்தனை", "Reflection"], ["வாசகங்கள்", "பிற நாட்கள்"]);

  return {
    id: getReadingDocId(date, language),
    date,
    language,
    title: language === "ta" ? "இன்றைய திருப்பலி வாசகங்கள்" : "Today's Mass Readings",
    liturgicalDay: liturgicalDayMatch?.[1]?.replace(/^#+\s*/, "").trim() || titleMatch?.[0]?.trim() || "Liturgical day not available",
    firstReading,
    psalm,
    secondReading,
    gospelAcclamation,
    gospel,
    reflection,
    sourceUrl: ARULVAKKU_CALENDAR_URL,
    publicDisplay,
    lastSyncedAt: now,
    syncStatus: "synced",
    createdAt: now,
    updatedAt: now,
    createdBy: "arulvakku-sync",
    updatedBy: "arulvakku-sync",
    status: "active",
    ...DEFAULT_TENANT_CONTEXT,
  };
}

async function fetchArulvakkuReading(date: string, language: BibleLanguage, publicDisplay = true): Promise<DailyReadingRecord> {
  if (language !== "ta") {
    throw new Error("English daily readings are prepared for future source integration.");
  }

  const response = await fetch(ARULVAKKU_CALENDAR_URL, {
    headers: {
      "User-Agent": "Choir360/1.0 (+daily-readings-sync)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Arulvakku source returned HTTP ${response.status}.`);
  }

  const html = await response.text();
  return parseArulvakkuReadings(html, date, language, publicDisplay);
}

async function readStoredDailyReading(date: string, language: BibleLanguage) {
  if (!admin.apps.length) return null;
  try {
    const snap = await admin.firestore().collection("dailyReadings").doc(getReadingDocId(date, language)).get();
    return snap.exists ? snap.data() as DailyReadingRecord : null;
  } catch (error: any) {
    console.warn("Daily readings Firestore read skipped:", error?.message || error);
    return null;
  }
}

async function writeStoredDailyReading(reading: DailyReadingRecord, userId = "arulvakku-sync") {
  if (!admin.apps.length) return reading;
  try {
    const existing = await admin.firestore().collection("dailyReadings").doc(reading.id).get();
    const now = new Date().toISOString();
    const payload = {
      ...reading,
      createdAt: existing.exists ? existing.data()?.createdAt || reading.createdAt : reading.createdAt,
      createdBy: existing.exists ? existing.data()?.createdBy || reading.createdBy : userId,
      updatedAt: now,
      updatedBy: userId,
    };
    await admin.firestore().collection("dailyReadings").doc(reading.id).set(payload, { merge: true });
    return payload as DailyReadingRecord;
  } catch (error: any) {
    console.warn("Daily readings Firestore write skipped:", error?.message || error);
    return reading;
  }
}

async function syncTodayDailyReadings(reason: "startup" | "scheduled") {
  const date = getDateInIndia();
  try {
    const reading = await fetchArulvakkuReading(date, "ta", true);
    await writeStoredDailyReading(reading, `system-${reason}`);
    console.log(`[Daily Readings] ${reason} sync completed for ${date}`);
  } catch (error: any) {
    console.warn(`[Daily Readings] ${reason} sync failed:`, error?.message || error);
  }
}

// -----------------------------------------------------------------------------
// CATHOLIC HUB SYNC — pulls the public Blogger Atom/JSON feed from
// catholictamil.com (a volunteer-run, donation-funded Catholic Tamil archive;
// robots.txt allows crawling /, disallows only /search and /share-widget).
// We sync feed METADATA (title, summary snippet, link, dates) for the most
// recent posts rather than full article bodies — the blog has 6,800+ historical
// posts and fetching every individual page would be both slow and disrespectful
// of their hosting costs. Full reading happens via sourceUrl back on their site.
// -----------------------------------------------------------------------------
interface CatholicHubContentRecord {
  id: string;
  title: string;
  titleTamil: string;
  description: string;
  category: string;
  sourceUrl: string;
  imageUrl: string;
  publishedAt: string;
  fetchedAt: string;
  language: "ta";
  contentType: "article";
  tags: string[];
  status: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  tenantId: string;
  parishId: string;
  choirId: string;
}

interface ContentSyncStatusRecord {
  sourceUrl: string;
  lastSyncedAt: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  status: "idle" | "syncing" | "success" | "failed";
  errorMessage?: string;
  totalItemsSynced: number;
  syncDurationMs: number;
}

const CATHOLIC_TAMIL_FEED_URL = "https://www.catholictamil.com/feeds/posts/default";
const CATHOLIC_HUB_SONG_CATEGORIES = [
  { categoryId: "varugai",        category: "varugai",        categoryTamil: "வருகைப் பாடல்கள்",               sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_7.html" },
  { categoryId: "thiruppadal",    category: "thiruppadal",    categoryTamil: "திருப்பாடல்கள்",                  sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_63.html" },
  { categoryId: "thiyanam",       category: "thiyanam",       categoryTamil: "தியானப் பாடல்கள்",                sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_16.html" },
  { categoryId: "kanikkai",       category: "kanikkai",       categoryTamil: "காணிக்கைப் பாடல்கள்",             sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_50.html" },
  { categoryId: "thiruvirundhu",  category: "thiruvirundhu",  categoryTamil: "திருவிருந்துப் பாடல்கள்",         sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_75.html" },
  { categoryId: "nandri",         category: "nandri",         categoryTamil: "நன்றிப் பாடல்கள்",                sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_34.html" },
  { categoryId: "arunkodai",      category: "arunkodai",      categoryTamil: "அருங்கொடைப் பாடல்கள்",            sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_67.html" },
  { categoryId: "parampariya",    category: "parampariya",    categoryTamil: "பாரம்பரியப் பாடல்கள்",            sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_85.html" },
  { categoryId: "thiruppali",     category: "thiruppali",     categoryTamil: "திருப்பலி பாடல்கள்",              sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_77.html" },
  { categoryId: "aradhana",       category: "aradhana",       categoryTamil: "ஆராதனைப் பாடல்கள்",              sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_83.html" },
  { categoryId: "oppuravai",      category: "oppuravai",      categoryTamil: "ஒப்புரவுப் பாடல்கள்",             sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_43.html" },
  { categoryId: "maatha",         category: "maatha",         categoryTamil: "மாதா பாடல்கள்",                   sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_88.html" },
  { categoryId: "thooyaaviyar",   category: "thooyaaviyar",   categoryTamil: "தூய ஆவியார் பாடல்கள்",            sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_1.html" },
  { categoryId: "christmas",      category: "christmas",      categoryTamil: "கிறிஸ்மஸ் பாடல்கள்",              sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_6.html" },
  { categoryId: "narkarunai",     category: "narkarunai",     categoryTamil: "நற்கருணை ஆசீர்",                  sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_911.html" },
  { categoryId: "praarthana",     category: "praarthana",     categoryTamil: "பிராத்தனைகள்",                    sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_543.html" },
  { categoryId: "thavakkaalam",   category: "thavakkaalam",   categoryTamil: "தவக்காலப் பாடல்கள்",              sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_91.html" },
  { categoryId: "kuruthu",        category: "kuruthu",        categoryTamil: "குருத்து ஞாயிறு பாடல்கள்",        sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_844.html" },
  { categoryId: "periya_viazham", category: "periya_viazham", categoryTamil: "பெரிய வியாழன் பாடல்கள்",          sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_191.html" },
  { categoryId: "punitha_velli",  category: "punitha_velli",  categoryTamil: "புனித வெள்ளி பாடல்கள்",           sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_616.html" },
  { categoryId: "siluvai",        category: "siluvai",        categoryTamil: "சிலுவைப் பாதை பாடல்கள்",          sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_454.html" },
  { categoryId: "paaska",         category: "paaska",         categoryTamil: "பாஸ்கா திருவிழிப்பு பாடல்கள்",   sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_870.html" },
  { categoryId: "thiruithayam",   category: "thiruithayam",   categoryTamil: "திருஇதயப் பாடல்கள்",              sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_4036.html" },
  { categoryId: "bajana",         category: "bajana",         categoryTamil: "பஜனைப் பாடல்கள்",                 sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_1443.html" },
  { categoryId: "sirar",          category: "sirar",          categoryTamil: "சிறார் பாடல்கள்",                  sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_7073.html" },
  { categoryId: "irandhor",       category: "irandhor",       categoryTamil: "இறந்தோர் திருப்பலிப் பாடல்கள்",  sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_527.html" },
  { categoryId: "thirumana",      category: "thirumana",      categoryTamil: "திருமணப் பாடல்கள்",               sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_8398.html" },
  { categoryId: "kuruthuvam",     category: "kuruthuvam",     categoryTamil: "குருத்துவப் பாடல்கள்",             sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_824.html" },
  { categoryId: "iraiirakkam",    category: "iraiirakkam",    categoryTamil: "இறைஇரக்கப் பாடல்கள்",             sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_541.html" },
  { categoryId: "parampariya2",   category: "parampariya2",   categoryTamil: "பாரம்பரியப் பாடல்கள் (2)",         sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_4645.html" },
  { categoryId: "punidar",        category: "punidar",        categoryTamil: "புனிதர் பாடல்கள்",                 sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_7512.html" },
  { categoryId: "naadiya",        category: "naadiya",        categoryTamil: "நாட்டியப் பாடல்கள்",               sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_8337.html" },
  { categoryId: "pazhaiya",       category: "pazhaiya",       categoryTamil: "பழைய பாடல்கள்",                   sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_5209.html" },
  { categoryId: "gregorian",      category: "gregorian",      categoryTamil: "இலத்தீன் கிரகோரியன் பாடல்கள்",   sourceUrl: "https://www.radio.catholictamil.com/p/gregorian-chant-hymns.html" },
  { categoryId: "keerthana",      category: "keerthana",      categoryTamil: "கிறிஸ்தவக் கீர்த்தனைகள்",         sourceUrl: "https://www.radio.catholictamil.com/p/blog-page_9031.html" },
] as const;

type CatholicHubSongCategoryId = typeof CATHOLIC_HUB_SONG_CATEGORIES[number]["categoryId"];

interface CatholicHubSongRecord {
  id: string;
  title: string;
  titleNormalized: string;
  category: string;
  categoryTamil: string;
  lyrics: string;
  lyricsNormalized: string;
  language: "ta";
  sourceUrl: string;
  /** Individual song page URL (canonical field name) */
  sourcePageUrl: string;
  /** Legacy alias kept for backward compat */
  sourcePage: string;
  tags: string[];
  order: number;
  status: "active" | "archived" | "disabled";
  /** SHA-256 first-16 of title+lyrics — used for incremental diff */
  contentHash: string;
  isArchived: boolean;
  isFeatured: boolean;
  /** ISO timestamp of when last seen on the source category page */
  lastSourceSeenAt: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  tenantId: string;
  parishId: string;
  choirId: string;
}

interface CatholicHubSongSyncStatusRecord {
  categoryId: string;
  categoryTamil: string;
  sourceUrl: string;
  status: "idle" | "syncing" | "success" | "failed";
  lastSyncedAt: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  errorMessage?: string;
  /** Detailed diff counts */
  totalFetched: number;
  totalCreated: number;
  totalUpdated: number;
  totalUnchanged: number;
  totalArchived: number;
  /** Legacy field — sum of created + updated */
  totalSongsSynced: number;
  syncDurationMs: number;
  nextScheduledSyncAt?: string;
}

// Free, rule-based keyword categorization — no paid AI required.
const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: "Daily Readings", keywords: ["வாசகங்கள்", "திருப்பலி வாசகம்"] },
  { category: "Saints", keywords: ["அர்ச்.", "புனிதர்", "அர்ச்சியசிஷ்ட"] },
  { category: "Prayers", keywords: ["செபம்", "செபங்கள்", "ஜெபம்", "ஜெபமாலை", "செபமாலை"] },
  { category: "Devotional Month", keywords: ["வணக்கமாதம்"] },
  { category: "Family & Marriage", keywords: ["குடும்பம்", "திருமணம்"] },
  { category: "Eucharist", keywords: ["நற்கருணை", "திவ்விய பலி"] },
  { category: "Marian Devotion", keywords: ["மாதா", "மரியா"] },
];

function categorizeCatholicHubTitle(title: string): { category: string; tags: string[] } {
  const matches = CATEGORY_KEYWORDS.filter(({ keywords }) => keywords.some((kw) => title.includes(kw)));
  if (matches.length === 0) return { category: "Article", tags: [] };
  return { category: matches[0].category, tags: matches.map((m) => m.category) };
}

function stripHtmlSummary(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
}

function normalizeTamilSearchText(value: string) {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    zwj: "\u200D",
    zwnj: "\u200C",
  };
  let decoded = value;
  for (let i = 0; i < 4; i++) {
    const next = decoded
      .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&([a-z]+);/gi, (_, name) => named[String(name).toLowerCase()] ?? `&${name};`);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function decodeCatholicHubSongRecord(record: any) {
  const title = decodeHtmlEntities(String(record.title || ""));
  const categoryTamil = decodeHtmlEntities(String(record.categoryTamil || ""));
  const lyrics = decodeHtmlEntities(String(record.lyrics || ""));
  const tags = Array.isArray(record.tags) ? record.tags.map((tag: unknown) => decodeHtmlEntities(String(tag))) : [];

  return {
    ...record,
    title,
    titleNormalized: normalizeTamilSearchText(title),
    categoryTamil,
    lyrics,
    lyricsNormalized: normalizeTamilSearchText(lyrics),
    tags,
  };
}

function stripHtmlToText(html: string) {
  return decodeHtmlEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function absoluteCatholicTamilUrl(href: string) {
  try {
    return new URL(decodeHtmlEntities(href), "https://www.radio.catholictamil.com").toString();
  } catch {
    return "";
  }
}

function getBloggerMainHtml(html: string) {
  const postBodyMatch = html.match(/<div[^>]+class=["'][^"']*post-body[^"']*["'][^>]*>([\s\S]*?)<div[^>]+class=["'][^"']*post-footer/i);
  if (postBodyMatch?.[1]) return postBodyMatch[1];
  const articleMatch = html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
  if (articleMatch?.[1]) return articleMatch[1];
  return html;
}

async function fetchCatholicTamilHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Choir360/1.0 (+catholic-hub-song-sync)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) {
    throw new Error(`Catholic Tamil song source returned HTTP ${response.status}.`);
  }
  return response.text();
}

function extractCatholicSongLinks(categoryPageHtml: string, sourceUrl: string) {
  const mainHtml = getBloggerMainHtml(categoryPageHtml);
  const links: Array<{ title: string; sourceUrl: string }> = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(mainHtml))) {
    const href = absoluteCatholicTamilUrl(match[1]);
    const title = stripCatholicHtmlToText(match[2]).replace(/^✠\s*/, "").trim();
    const isSameHost = href.startsWith("https://www.radio.catholictamil.com/");
    const isSongPage = /\/20\d{2}\/\d{2}\//.test(href) || href.includes(".html");
    if (!title || title.length < 2 || !isSameHost || href === sourceUrl || !isSongPage || seen.has(href)) continue;
    seen.add(href);
    links.push({ title, sourceUrl: href });
  }

  return links;
}

function extractCatholicSongLyrics(songHtml: string, fallbackTitle: string) {
  const mainHtml = getBloggerMainHtml(songHtml);
  const text = stripCatholicHtmlToText(mainHtml);
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines.find((line) => normalizeTamilSearchText(line).includes(normalizeTamilSearchText(fallbackTitle)))
    || fallbackTitle;
  const chromePatterns = [
    /^posted by/i,
    /^labels?:/i,
    /^இதற்கு குழுசேர்/,
    /^முகப்பு$/,
    /^நமது தளங்கள்/,
    /^♫ பாடல்கள்/,
    // site watermark: "♪ பாடலைக் கேட்க / பதிவிரக்கம் செய்ய..."
    /♪\s*பாடலைக்/,
    /பதிவிரக்கம் செய்ய/,
    /^♪\s*♪/,
    /கேட்க\s*\/\s*பதிவிரக்கம்/,
  ];
  const lyrics = lines
    .filter((line) => line !== title)
    .filter((line) => !chromePatterns.some((pattern) => pattern.test(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, lyrics };
}

function makeCatholicHubSongId(categoryId: string, title: string, order: number) {
  const normalized = normalizeTamilSearchText(title);
  const digest = crypto.createHash("sha1").update(`${categoryId}:${normalized}:${order}`).digest("hex").slice(0, 10);
  return `${categoryId}-${digest}`;
}

/**
 * Short SHA-256 fingerprint of a song's content.
 * Used for incremental diff — only songs whose content actually changed are
 * written to Firestore, keeping write costs low.
 */
function computeContentHash(title: string, lyrics: string): string {
  return crypto
    .createHash("sha256")
    .update(`${title}\n${lyrics}`)
    .digest("hex")
    .slice(0, 16);
}

async function fetchCatholicTamilFeedPage(startIndex: number, maxResults: number) {
  const url = `${CATHOLIC_TAMIL_FEED_URL}?alt=json&start-index=${startIndex}&max-results=${maxResults}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Choir360/1.0 (+catholic-hub-sync; respects robots.txt)" },
  });
  if (!response.ok) {
    throw new Error(`catholictamil.com feed returned HTTP ${response.status}.`);
  }
  const data = await response.json();
  return (data?.feed?.entry || []) as any[];
}

async function syncCatholicHubContent(userId = "system-sync") {
  const startedAt = Date.now();
  if (!admin.apps.length) {
    throw new Error("Firebase Admin is not configured — cannot persist Catholic Hub sync results.");
  }

  const PAGES = 3;
  const PAGE_SIZE = 20;
  const now = new Date().toISOString();
  const records: CatholicHubContentRecord[] = [];

  for (let page = 0; page < PAGES; page++) {
    const entries = await fetchCatholicTamilFeedPage(page * PAGE_SIZE + 1, PAGE_SIZE);
    for (const entry of entries) {
      const title: string = entry?.title?.$t || "";
      const summaryRaw: string = entry?.summary?.$t || "";
      const altLink = (entry?.link || []).find((l: any) => l.rel === "alternate");
      const sourceUrl: string = altLink?.href || "";
      const postId: string = String(entry?.id?.$t || "").split("post-").pop() || `${Date.now()}-${records.length}`;
      const publishedAt: string = entry?.published?.$t || now;
      const { category, tags } = categorizeCatholicHubTitle(title);

      if (!title || !sourceUrl) continue;

      records.push({
        id: `ct-${postId}`,
        title,
        titleTamil: title,
        description: stripHtmlSummary(summaryRaw),
        category,
        sourceUrl,
        imageUrl: "",
        publishedAt,
        fetchedAt: now,
        language: "ta",
        contentType: "article",
        tags,
        status: "active",
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        ...DEFAULT_TENANT_CONTEXT,
      });
    }
  }

  const batch = admin.firestore().batch();
  const collection = admin.firestore().collection("catholicHubContent");
  for (const record of records) {
    const ref = collection.doc(record.id);
    const existing = await ref.get();
    batch.set(ref, {
      ...record,
      createdAt: existing.exists ? existing.data()?.createdAt || record.createdAt : record.createdAt,
      createdBy: existing.exists ? existing.data()?.createdBy || record.createdBy : record.createdBy,
      isFeatured: existing.exists ? Boolean(existing.data()?.isFeatured) : record.isFeatured,
      status: existing.exists ? (existing.data()?.status || record.status) : record.status,
    }, { merge: true });
  }
  await batch.commit();

  const statusRecord: ContentSyncStatusRecord = {
    sourceUrl: CATHOLIC_TAMIL_FEED_URL,
    lastSyncedAt: now,
    lastSuccessAt: now,
    status: "success",
    totalItemsSynced: records.length,
    syncDurationMs: Date.now() - startedAt,
  };
  await admin.firestore().collection("contentSyncStatus").doc("catholicTamil").set(statusRecord, { merge: true });

  return { itemsSynced: records.length, durationMs: statusRecord.syncDurationMs };
}

function resolveCatholicHubSongCategories(categoryId?: unknown) {
  const requested = typeof categoryId === "string" ? categoryId.trim() : "";
  if (!requested || requested === "all") return [...CATHOLIC_HUB_SONG_CATEGORIES];
  const category = CATHOLIC_HUB_SONG_CATEGORIES.find((item) => item.categoryId === requested);
  if (!category) throw new Error("Unknown Catholic Hub song category.");
  return [category];
}

async function syncCatholicHubSongs(categoryId?: CatholicHubSongCategoryId | "all", userId = "system-sync") {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin is not configured — cannot persist Catholic Hub songs.");
  }

  const categories = resolveCatholicHubSongCategories(categoryId);
  const firestore = admin.firestore();
  const now = new Date().toISOString();

  // Next scheduled sync = first day of next month at 04:00 IST
  const nextSync = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    d.setHours(4, 0, 0, 0);
    return d.toISOString();
  })();

  const synced: Array<{
    categoryId: string;
    totalFetched: number;
    totalCreated: number;
    totalUpdated: number;
    totalUnchanged: number;
    totalArchived: number;
    syncDurationMs: number;
  }> = [];

  for (const category of categories) {
    const startedAt = Date.now();
    const statusRef = firestore.collection("catholicHubSongSyncStatus").doc(category.categoryId);

    // Mark as syncing
    await statusRef.set({
      categoryId: category.categoryId,
      categoryTamil: category.categoryTamil,
      sourceUrl: category.sourceUrl,
      status: "syncing",
      lastSyncedAt: now,
      totalFetched: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalUnchanged: 0,
      totalArchived: 0,
      totalSongsSynced: 0,
      syncDurationMs: 0,
    } satisfies CatholicHubSongSyncStatusRecord, { merge: true });

    try {
      // ── 1. Fetch source page ───────────────────────────────────────────────
      const categoryHtml = await fetchCatholicTamilHtml(category.sourceUrl);
      const links = extractCatholicSongLinks(categoryHtml, category.sourceUrl);

      // ── 2. Fetch all existing songs for this category from Firestore ───────
      const existingSnap = await firestore
        .collection("catholicHubSongs")
        .where("category", "==", category.categoryId)
        .get();

      // Map: sourceUrl → existing Firestore document data
      const existingBySourceUrl = new Map<string, FirebaseFirestore.DocumentData>();
      for (const doc of existingSnap.docs) {
        const data = doc.data();
        if (data.sourceUrl) existingBySourceUrl.set(data.sourceUrl, data);
      }

      // ── 3. Fetch individual song pages & build diff ────────────────────────
      const toWrite: CatholicHubSongRecord[] = [];
      const seenSourceUrls = new Set<string>();
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalUnchanged = 0;

      for (const [index, link] of links.entries()) {
        seenSourceUrls.add(link.sourceUrl);
        try {
          const songHtml = await fetchCatholicTamilHtml(link.sourceUrl);
          const extracted = extractCatholicSongLyrics(songHtml, link.title);
          const title = extracted.title || link.title;
          const lyrics = extracted.lyrics || "";
          const contentHash = computeContentHash(title, lyrics);
          const existing = existingBySourceUrl.get(link.sourceUrl);

          if (existing) {
            if (existing.contentHash === contentHash) {
              // Content unchanged — just update lastSourceSeenAt (cheap touch)
              totalUnchanged++;
              toWrite.push({
                ...(existing as CatholicHubSongRecord),
                lastSourceSeenAt: now,
                lastSyncedAt: now,
                updatedAt: now,
                updatedBy: userId,
                isArchived: false,
                status: "active",
              });
            } else {
              // Content changed — update title/lyrics/hash
              totalUpdated++;
              toWrite.push({
                ...(existing as CatholicHubSongRecord),
                title,
                titleNormalized: normalizeTamilSearchText(title),
                lyrics,
                lyricsNormalized: normalizeTamilSearchText(lyrics),
                contentHash,
                order: index + 1,
                lastSourceSeenAt: now,
                lastSyncedAt: now,
                updatedAt: now,
                updatedBy: userId,
                isArchived: false,
                status: "active",
              });
            }
          } else {
            // New song — create record
            totalCreated++;
            toWrite.push({
              id: makeCatholicHubSongId(category.categoryId, title, index + 1),
              title,
              titleNormalized: normalizeTamilSearchText(title),
              category: category.categoryId,
              categoryTamil: category.categoryTamil,
              lyrics,
              lyricsNormalized: normalizeTamilSearchText(lyrics),
              contentHash,
              language: "ta",
              sourceUrl: link.sourceUrl,
              sourcePageUrl: category.sourceUrl,
              sourcePage: category.sourceUrl,
              tags: [category.categoryTamil, category.categoryId],
              order: index + 1,
              status: "active",
              isArchived: false,
              isFeatured: false,
              lastSourceSeenAt: now,
              lastSyncedAt: now,
              createdAt: now,
              updatedAt: now,
              createdBy: userId,
              updatedBy: userId,
              ...DEFAULT_TENANT_CONTEXT,
            });
          }
        } catch (error: any) {
          console.warn(`[Catholic Hub Songs] skipped "${link.title}":`, error?.message || error);
        }
      }

      // ── 4. Archive songs no longer on the source page ─────────────────────
      let totalArchived = 0;
      const archiveBatch = firestore.batch();
      for (const [url, existing] of existingBySourceUrl.entries()) {
        if (!seenSourceUrls.has(url) && existing.status !== "archived" && !existing.isArchived) {
          totalArchived++;
          const ref = firestore.collection("catholicHubSongs").doc(existing.id);
          archiveBatch.set(ref, {
            ...existing,
            status: "archived",
            isArchived: true,
            updatedAt: now,
            updatedBy: userId,
          }, { merge: true });
        }
      }
      if (totalArchived > 0) await archiveBatch.commit();

      // ── 5. Write new/updated songs in batches of 450 ──────────────────────
      const BATCH_SIZE = 450;
      for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
        const batch = firestore.batch();
        for (const record of toWrite.slice(i, i + BATCH_SIZE)) {
          const ref = firestore.collection("catholicHubSongs").doc(record.id);
          batch.set(ref, record, { merge: true });
        }
        await batch.commit();
      }

      // ── 6. Update sync status ──────────────────────────────────────────────
      const syncDurationMs = Date.now() - startedAt;
      const successNow = new Date().toISOString();
      const totalCreatedUpdated = totalCreated + totalUpdated;
      await statusRef.set({
        categoryId: category.categoryId,
        categoryTamil: category.categoryTamil,
        sourceUrl: category.sourceUrl,
        status: "success",
        lastSyncedAt: successNow,
        lastSuccessAt: successNow,
        totalFetched: links.length,
        totalCreated,
        totalUpdated,
        totalUnchanged,
        totalArchived,
        totalSongsSynced: totalCreatedUpdated,
        syncDurationMs,
        nextScheduledSyncAt: nextSync,
      } satisfies CatholicHubSongSyncStatusRecord, { merge: true });

      synced.push({
        categoryId: category.categoryId,
        totalFetched: links.length,
        totalCreated,
        totalUpdated,
        totalUnchanged,
        totalArchived,
        syncDurationMs,
      });

      console.log(
        `[Catholic Hub Songs] ${category.categoryId}: +${totalCreated} new, ~${totalUpdated} updated, ` +
        `=${totalUnchanged} unchanged, ✗${totalArchived} archived (${syncDurationMs}ms)`
      );
    } catch (error: any) {
      const failNow = new Date().toISOString();
      await statusRef.set({
        categoryId: category.categoryId,
        categoryTamil: category.categoryTamil,
        sourceUrl: category.sourceUrl,
        status: "failed",
        lastSyncedAt: failNow,
        lastFailureAt: failNow,
        errorMessage: error?.message || "Sync failed.",
        totalFetched: 0,
        totalCreated: 0,
        totalUpdated: 0,
        totalUnchanged: 0,
        totalArchived: 0,
        totalSongsSynced: 0,
        syncDurationMs: Date.now() - startedAt,
      } satisfies CatholicHubSongSyncStatusRecord, { merge: true });
      throw error;
    }
  }

  const totalCreated = synced.reduce((s, c) => s + c.totalCreated, 0);
  const totalUpdated = synced.reduce((s, c) => s + c.totalUpdated, 0);
  return {
    categories: synced,
    totalSongsSynced: totalCreated + totalUpdated,
    totalCreated,
    totalUpdated,
    totalUnchanged: synced.reduce((s, c) => s + c.totalUnchanged, 0),
    totalArchived: synced.reduce((s, c) => s + c.totalArchived, 0),
  };
}

async function syncCatholicHubOnStartup() {
  try {
    const result = await syncCatholicHubContent("system-startup");
    console.log(`[Catholic Hub] startup sync completed — ${result.itemsSynced} items in ${result.durationMs}ms`);
  } catch (error: any) {
    console.warn("[Catholic Hub] startup sync failed:", error?.message || error);
  }
}

// Lazy-initialization utility for GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    console.warn("GEMINI_API_KEY is not defined or is a placeholder. Choir360 will operate in high-precision simulated AI mode.");
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// -----------------------------------------------------------------------------
// BACKEND API ROUTES
// -----------------------------------------------------------------------------

app.get("/api/bible/daily-readings", async (req, res) => {
  const date = normalizeReadingDate(req.query.date);
  const language = normalizeReadingLanguage(req.query.language);
  const refresh = req.query.refresh === "1" || req.query.refresh === "true";

  try {
    const cached = await readStoredDailyReading(date, language);
    if (cached && !refresh) {
      if (cached.publicDisplay === false) {
        return res.status(404).json({ error: "Daily readings are not publicly displayed for this date." });
      }
      return res.json({ reading: { ...cached, syncStatus: "cached" } });
    }

    const synced = await fetchArulvakkuReading(date, language, cached?.publicDisplay ?? true);
    const stored = await writeStoredDailyReading(synced);
    if (stored.publicDisplay === false) {
      return res.status(404).json({ error: "Daily readings are not publicly displayed for this date." });
    }
    return res.json({ reading: stored });
  } catch (error: any) {
    const cached = await readStoredDailyReading(date, language);
    if (cached) {
      return res.json({
        reading: {
          ...cached,
          syncStatus: "cached",
          syncMessage: `Showing cached readings. Latest sync failed: ${error.message}`,
        },
      });
    }

    return res.status(502).json({
      error: error.message || "Daily readings could not be synced.",
      sourceUrl: ARULVAKKU_CALENDAR_URL,
    });
  }
});

app.post("/api/bible/daily-readings/sync", requireFirebaseAuth, requireAdminRole, async (req, res) => {
  const date = normalizeReadingDate(req.body?.date);
  const language = normalizeReadingLanguage(req.body?.language);
  const publicDisplay = req.body?.publicDisplay !== false;

  try {
    const synced = await fetchArulvakkuReading(date, language, publicDisplay);
    const stored = await writeStoredDailyReading(synced, (req as any).user?.uid || "admin-sync");
    return res.json({ reading: stored });
  } catch (error: any) {
    const cached = await readStoredDailyReading(date, language);
    if (cached) {
      await writeStoredDailyReading({
        ...cached,
        syncStatus: "failed",
        syncMessage: error.message || "Sync failed.",
        updatedAt: new Date().toISOString(),
      }, (req as any).user?.uid || "admin-sync");
    }
    return res.status(502).json({ error: error.message || "Daily readings sync failed." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/catholic-hub/songs
// Reads from Firestore ONLY — never triggers a source scrape.
// The frontend now reads Firestore directly via the Firebase client SDK;
// this endpoint is kept for admin tooling and backward compat.
// ---------------------------------------------------------------------------
app.get("/api/catholic-hub/songs", async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.json({
        songs: [],
        syncStatus: [],
        categories: CATHOLIC_HUB_SONG_CATEGORIES,
      });
    }

    const category = typeof req.query.category === "string" ? req.query.category : "all";
    let firestoreQuery: FirebaseFirestore.Query = admin.firestore()
      .collection("catholicHubSongs")
      .where("status", "==", "active");
    if (category && category !== "all") {
      firestoreQuery = firestoreQuery.where("category", "==", category);
    }

    // Read from Firestore only — no lazy sync here.
    const snapshot = await firestoreQuery.limit(1500).get();

    const songs = snapshot.docs
      .map((doc) => decodeCatholicHubSongRecord(doc.data()))
      .sort((a: any, b: any) => {
        const catSort = String(a.category || "").localeCompare(String(b.category || ""));
        return catSort !== 0 ? catSort : Number(a.order || 0) - Number(b.order || 0);
      });

    const statusSnapshot = await admin.firestore().collection("catholicHubSongSyncStatus").get();

    return res.json({
      songs,
      syncStatus: statusSnapshot.docs.map((doc) => doc.data()),
      categories: CATHOLIC_HUB_SONG_CATEGORIES,
    });
  } catch {
    return res.status(502).json({
      error: "Songs could not be loaded from cache.",
    });
  }
});

app.post("/api/catholic-hub/songs/sync", requireFirebaseAuth, requireAdminRole, async (req, res) => {
  const requestedCategory = typeof req.body?.categoryId === "string" ? req.body.categoryId : "all";
  try {
    const result = await syncCatholicHubSongs(
      requestedCategory as CatholicHubSongCategoryId | "all",
      (req as any).user?.uid || "admin-sync",
    );
    return res.json({
      message: "Catholic Hub songs sync completed.",
      totalCreated: result.totalCreated,
      totalUpdated: result.totalUpdated,
      totalUnchanged: result.totalUnchanged,
      totalArchived: result.totalArchived,
      totalSongsSynced: result.totalSongsSynced,
      categories: result.categories,
    });
  } catch (error: any) {
    return res.status(502).json({
      error: error?.message || "Catholic Hub songs sync failed.",
    });
  }
});

app.get("/api/catholic-hub/content", async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.json({ content: [], syncStatus: null });
    }

    const snapshot = await admin.firestore()
      .collection("catholicHubContent")
      .where("status", "==", "active")
      .orderBy("publishedAt", "desc")
      .limit(60)
      .get();

    const content = snapshot.docs.map((doc) => doc.data());
    const statusDoc = await admin.firestore().collection("contentSyncStatus").doc("catholicTamil").get();

    return res.json({
      content,
      syncStatus: statusDoc.exists ? statusDoc.data() : null,
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || "Catholic Hub content could not be loaded." });
  }
});

app.post("/api/catholic-hub/sync", requireFirebaseAuth, requireAdminRole, async (req, res) => {
  try {
    const result = await syncCatholicHubContent((req as any).user?.uid || "admin-sync");
    return res.json({ message: "Catholic Hub sync completed.", ...result });
  } catch (error: any) {
    if (admin.apps.length) {
      await admin.firestore().collection("contentSyncStatus").doc("catholicTamil").set({
        sourceUrl: CATHOLIC_TAMIL_FEED_URL,
        lastSyncedAt: new Date().toISOString(),
        lastFailureAt: new Date().toISOString(),
        status: "failed",
        errorMessage: error.message || "Sync failed.",
      }, { merge: true }).catch(() => undefined);
    }
    return res.status(502).json({ error: error.message || "Catholic Hub sync failed." });
  }
});

// ─── Catholic Tamil Radio — RadioKing stream proxy ────────────────────────────

/** Picks first truthy string value from an object by trying multiple keys. */
function pickUrl(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.startsWith("http")) return v;
  }
  return null;
}

app.get("/api/radio/stream-url", async (_req, res) => {
  const UA = "Choir360/1.0 (+catholic-tamil-radio-player)";
  let streamUrl: string | null = null;
  let artist = "";
  let title = "Catholic Tamil Radio";

  // ── Approach 1: track/current endpoint ──────────────────────────────────────
  try {
    const r = await fetch(
      "https://api.radioking.io/widget/radio/catholic-tamil/track/current",
      { headers: { "User-Agent": UA } }
    );
    if (r.ok) {
      const d = await r.json() as Record<string, unknown>;
      console.log("[Radio] track/current keys:", Object.keys(d).join(", "));
      streamUrl = pickUrl(d, "radio_url", "stream_url", "url", "listen_url", "radioUrl", "streamUrl");
      artist = String(d.artist || "");
      title  = String(d.title  || "Catholic Tamil Radio");
    }
  } catch (e: any) {
    console.warn("[Radio] track/current error:", e?.message);
  }

  // ── Approach 2: widget station info endpoint ─────────────────────────────────
  if (!streamUrl) {
    try {
      const r = await fetch(
        "https://api.radioking.io/widget/radio/catholic-tamil",
        { headers: { "User-Agent": UA } }
      );
      if (r.ok) {
        const d = await r.json() as Record<string, unknown>;
        console.log("[Radio] widget keys:", Object.keys(d).join(", "));
        streamUrl = pickUrl(d, "radio_url", "stream_url", "url", "listen_url", "radioUrl", "streamUrl");
      }
    } catch (e: any) {
      console.warn("[Radio] widget endpoint error:", e?.message);
    }
  }

  // ── Approach 3: parse the play page HTML for a stream URL ────────────────────
  if (!streamUrl) {
    try {
      const r = await fetch("https://www.radioking.com/play/catholic-tamil", {
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      if (r.ok) {
        const html = await r.text();
        // Look for listen.radioking.com stream URLs embedded in page JS/JSON
        const match = html.match(/https:\/\/listen\.radioking\.com\/radio\/[\w\/]+/);
        if (match) {
          streamUrl = match[0];
          console.log("[Radio] stream URL extracted from play page:", streamUrl);
        }
      }
    } catch (e: any) {
      console.warn("[Radio] play page scrape error:", e?.message);
    }
  }

  console.log("[Radio] final streamUrl:", streamUrl);
  return res.json({ streamUrl, artist, title });
});

app.post("/api/cloudinary/signature", uploadLimiter, requireFirebaseAuth, (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const { folder, tags = [], context = {} } = req.body || {};

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(501).json({
      error: "Cloudinary is not configured",
      required: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    });
  }

  if (!folder || !(String(folder) === "choir360" || String(folder).startsWith("choir360/"))) {
    return res.status(400).json({ error: "A scoped choir360 Cloudinary folder is required" });
  }

  if (!Array.isArray(tags) || tags.length > 12) {
    return res.status(400).json({ error: "tags must be an array with at most 12 values." });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const tagString = Array.isArray(tags) ? tags.join(",") : String(tags);
  const contextString = Object.entries(context)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("|");

  const paramsToSign: Record<string, string | number> = {
    context: contextString,
    folder,
    tags: tagString,
    timestamp,
  };

  const signatureBase = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&");

  const signature = crypto
    .createHash("sha1")
    .update(`${signatureBase}${apiSecret}`)
    .digest("hex");

  return res.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    tags: tagString,
    context: contextString,
    signature,
  });
});

// 1. AI Liturgical Companion Chat Endpoint
app.post("/api/gemini/assistant", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  let message: string;
  try {
    message = requireString(req.body?.message, "message", 3000);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }

  const { chatHistory = [], activeRole = "public_user", language = "en" } = req.body;

  const systemInstruction = `
    You are the "Choir360 AI Liturgical Assistant," a highly specialized companion for Roman Catholic Choirs and Ministries in Tamil Nadu and South India (supporting English, Tamil, Malayalam, Telugu, and Hindi).
    
    Current User Role Context in App: '${activeRole}'.
    Preferred Communication Language: '${language}'.
    
    General Guidelines:
    - Respond with warmth, liturgical precision, and professional poise.
    - Provide helpful inputs regarding Roman Catholic liturgical rubrics (e.g., Ordinary Time, Advent, Lent, Easter, saints, Catholic choral parts: Soprano, Alto, Tenor, Bass).
    - If asked about songs, recommend relevant hymns. Encourage liturgical appropriateness (e.g. matching seasonal colors: Violet for Advent/Lent, Green for Ordinary Time, White for Feast/Weddings).
    - When asked about songs, use only the current imported PDF Music Library as the source of truth.
    - If the user asks about choir management, give advice on rehearsals, voice balancing, dynamic share calculation, and roster assignment.
    - Limit responses to be highly structured, digestible, and beautifully formatted in markdown.
  `;

  try {
    const ai = getGeminiClient();
    if (ai) {
      // Build simple prompt including history
      let prompt = `${systemInstruction}\n\n`;
      if (chatHistory.length > 0) {
        prompt += "Previous conversation history:\n";
        chatHistory.forEach((h: any) => {
          prompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}\n`;
        });
      }
      prompt += `\nUser asks: ${message}\nResponse:`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      return res.json({ text: response.text || "I apologize, I could not generate a response." });
    } else {
      // Premium Simulated Response fallback when API key is missing
      return res.json({
        text: getSimulatedAssistantResponse(message, activeRole, language),
        simulated: true
      });
    }
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    res.status(500).json({
      error: "Error generating response",
      details: error.message,
      text: "Peace be with you. I am currently adjusting my vocal harmonies (the Gemini API key appears misconfigured or timed out). Let me answer using my local liturgical database:\n\n" + getSimulatedAssistantResponse(message, activeRole, language)
    });
  }
});

// 2. AI Song Recommendation Endpoint
app.post("/api/gemini/recommend", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  const { massType, season, language = "English", choirStrength = "balanced", customPrompt = "" } = req.body;
  try {
    requireString(massType, "massType", 120);
    requireString(season, "season", 120);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }

  const prompt = `
    Conduct an expert Roman Catholic Liturgical Song Selection.
    Mass Type: ${massType}
    Liturgy Season: ${season}
    Primary Desired Song Language: ${language}
    Choir Strength & Vocal Balance: ${choirStrength}
    Additional User Preferences: ${customPrompt || "None"}
    
    Format the recommendation in clean JSON matching this exact typescript signature:
    {
      "explanation": "Brief paragraph explaining the liturgical theme, appropriate vestment color, and song alignment guidelines.",
      "recommendedSongs": [
        {
          "type": "Entrance Hymn",
          "title": "Song Title",
          "liturgicalReasoning": "Why this hymn perfectly fits the celebration."
        },
        {
          "type": "Offertory Hymn",
          "title": "Song Title",
          "liturgicalReasoning": "Why this fits the offering and sacrifice is appropriate."
        },
        {
          "type": "Communion Hymn",
          "title": "Song Title",
          "liturgicalReasoning": "Choral focus on Eucharistic solemnity."
        },
        {
          "type": "Recessional/Final Hymn",
          "title": "Song Title",
          "liturgicalReasoning": "Sending forth with joy and apostolic spirit."
        }
      ]
    }
    Return ONLY standard JSON. No markdown backticks.
  `;

  try {
    const ai = getGeminiClient();
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text || "{}";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return res.json(JSON.parse(cleanJson));
    } else {
      return res.json(getSimulatedRecommendations(massType, season, language));
    }
  } catch (error: any) {
    console.error("Gemini Recommendation Error:", error);
    return res.json(getSimulatedRecommendations(massType, season, language));
  }
});

// 3. AI Schedule Optimizer Endpoint
app.post("/api/gemini/optimize", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  const { members, massDetails } = req.body;
  if (!Array.isArray(members) || members.length > 200) {
    return res.status(400).json({ error: "members must be an array with at most 200 records." });
  }

  const prompt = `
    Analyze the available Roman Catholic Choir members, instruments, and vocal registers for:
    Mass/Event Name: ${massDetails?.name}
    Date/Time: ${massDetails?.date} ${massDetails?.time}
    
    Choir Members list: ${JSON.stringify(members)}
    
    Please output optimization suggestions. Focus on:
    1. Vocal Section Balance (Is there a proper mix of Soprano, Alto, Tenor, Bass)?
    2. Instrumentalist Coverage (Do we have a Keyboardist or supporting strings/woodwinds, e.g. Violin/Flute)?
    3. Suggested Choir Lead / Solos.
    4. Safety Alerts (e.g. "Action Required: Missing keyboardist/organist").
    
    Format the output as a JSON object with this exact structure:
    {
      "balanceScore": 85, // out of 100
      "evaluation": "Overall analysis statement",
      "vocalBalanceStatus": "status message of voice registers",
      "instrumentalStatus": "status signature",
      "suggestedRosterIds": ["ID1", "ID2", "ID3"], // ids of recommended active members
      "structuralSuggestions": [
        "Suggestion 1",
        "Suggestion 2"
      ],
      "safetyAlerts": [
        "Alert 1 (if any)"
      ]
    }
    Return ONLY valid JSON.
  `;

  try {
    const ai = getGeminiClient();
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      const text = response.text || "{}";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return res.json(JSON.parse(cleanJson));
    } else {
      return res.json(getSimulatedOptimization(members, massDetails));
    }
  } catch (error: any) {
    console.error("Gemini Optimize Error:", error);
    return res.json(getSimulatedOptimization(members, massDetails));
  }
});

// 4. AI Content Generator Endpoint
app.post("/api/gemini/generate-content", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  const { type, details, language = "en" } = req.body;
  try {
    requireString(type, "type", 80);
    requireString(details, "details", 3000);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }

  const prompt = `
    Generate professional, beautifully styled church bulletin/choir message content.
    Content Type: ${type} (e.g. announcement, birthdayWish, invitation, thankYou, newsletter)
    Additional guidelines / raw details: ${details}
    Selected language: ${language}
    
    Generate high-quality liturgical announcements or congratulations. Make it professional, welcoming, respectful, and fully structured.
    Return a JSON response with:
    {
      "subject": "Beautiful Subject line / Title",
      "body": "Formatted body text with elegant spacing.",
      "closing": "Choir director signature style"
    }
    Return ONLY JSON.
  `;

  try {
    const ai = getGeminiClient();
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      const text = response.text || "{}";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return res.json(JSON.parse(cleanJson));
    } else {
      return res.json(getSimulatedContentGen(type, details, language));
    }
  } catch (error) {
    console.error("Gemini Content Gen Error:", error);
    return res.json(getSimulatedContentGen(type, details, language));
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// 5. Smart Transliteration Search
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/gemini/smart-search", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  const { query, songs = [], language = "ta" } = req.body as {
    query?: string;
    songs?: Array<{ id: string; title: string; lyrics?: string }>;
    language?: string;
  };

  if (!query || typeof query !== "string" || query.trim().length < 1) {
    return res.status(400).json({ error: "query is required." });
  }
  const q = query.trim().slice(0, 200);

  // Fallback: simple substring match on titles
  function simulatedSearch() {
    const lq = q.toLowerCase();
    const matched = (songs as Array<{ id: string; title: string; lyrics?: string }>)
      .filter((s) => s.title?.toLowerCase().includes(lq) || s.lyrics?.toLowerCase().includes(lq))
      .slice(0, 10)
      .map((s) => ({ id: s.id, title: s.title, score: 1 }));
    return res.json({ results: matched, query: q, source: "local" });
  }

  try {
    const ai = getGeminiClient();
    if (!ai) return simulatedSearch();

    const songList = (songs as Array<{ id: string; title: string }>)
      .slice(0, 200)
      .map((s, i) => `${i + 1}. [${s.id}] ${s.title}`)
      .join("\n");

    const prompt = `You are a Tamil Catholic song search assistant.
User query: "${q}"
Language preference: ${language}

Song list (id and title):
${songList}

Return up to 10 matching songs as JSON array:
[{"id":"<song_id>","title":"<song_title>","score":<0.0-1.0>}]
Score 1.0 = perfect match. Return ONLY the JSON array, no extra text.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const text = (response.text || "[]").replace(/```json|```/g, "").trim();
    const results = JSON.parse(text);
    return res.json({ results, query: q, source: "gemini" });
  } catch (error: any) {
    console.warn("[SmartSearch] Gemini failed, falling back to local:", error?.message);
    return simulatedSearch();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED SYNC ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns milliseconds until the next occurrence of a given IST hour (0-23).
 * Used to align setInterval-based syncs to clock boundaries.
 */
function msUntilISTHour(targetHour: number): number {
  const now = new Date();
  // Current IST time
  const istStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const ist = new Date(istStr);
  const next = new Date(ist);
  next.setHours(targetHour, 0, 0, 0);
  if (next <= ist) next.setDate(next.getDate() + 1);
  return next.getTime() - ist.getTime();
}

/**
 * Schedules a callback at a fixed IST hour, then repeats every 24h.
 * Runs once immediately (on startup) then at each target hour.
 */
function scheduleDailyAt(istHour: number, label: string, fn: () => void) {
  const delay = msUntilISTHour(istHour);
  console.log(`[Scheduler] "${label}" first run in ${Math.round(delay / 60000)}m (IST ${String(istHour).padStart(2, '0')}:00)`);
  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000); // repeat every 24h
  }, delay);
}

/**
 * Daily Gospel / Mass Readings — synced 3× per day at IST 05:30, 12:00, 18:00.
 * arulvakku.com publishes readings for the next day around midnight IST, so the
 * 05:30 run captures them before morning prayer; 12:00 and 18:00 act as retries
 * in case the morning fetch fails (Render free-tier cold start, network blip, etc.)
 */
function startReadingsSchedule() {
  // Immediate startup sync
  void syncTodayDailyReadings("startup");

  // 05:30 IST — before morning prayer / Mass
  scheduleDailyAt(5, "readings-0530", () => {
    // fine-grain: fire at :30 past the hour
    setTimeout(() => void syncTodayDailyReadings("scheduled"), 30 * 60 * 1000);
  });
  // 12:00 IST — midday retry
  scheduleDailyAt(12, "readings-1200", () => void syncTodayDailyReadings("scheduled"));
  // 18:00 IST — evening retry
  scheduleDailyAt(18, "readings-1800", () => void syncTodayDailyReadings("scheduled"));
}

/**
 * Catholic Hub content (catholictamil.com Atom feed) — synced once per day at
 * IST 03:00 (off-peak). Also runs once at startup (non-blocking).
 *
 * Songs from radio.catholictamil.com — synced ONCE PER MONTH.
 * After a successful full sync the timestamp is stored in Firestore
 * (contentSyncStatus/songs-monthly). On each daily check we read that
 * document; if it is less than 30 days old we skip. This means:
 *   • Songs are never re-scraped more than once a month
 *   • The stored data persists indefinitely — no data loss between deploys
 *   • A manual "Sync all" from the admin UI bypasses the gate
 */
async function runMonthlySongSyncIfNeeded(userId = "system-monthly") {
  if (!admin.apps.length) return;
  const db = admin.firestore();
  const statusRef = db.collection("contentSyncStatus").doc("songs-monthly");
  try {
    const snap = await statusRef.get();
    if (snap.exists) {
      const lastSuccess: string | undefined = snap.data()?.lastSuccessAt;
      if (lastSuccess) {
        const age = Date.now() - new Date(lastSuccess).getTime();
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        if (age < THIRTY_DAYS) {
          const daysAgo = Math.floor(age / (24 * 60 * 60 * 1000));
          console.log(`[Songs Monthly] last sync was ${daysAgo}d ago — skipping (next in ${30 - daysAgo}d).`);
          return;
        }
      }
    }
  } catch (e: any) {
    console.warn("[Songs Monthly] could not read sync status:", e?.message);
  }

  console.log("[Songs Monthly] starting full song sync for all 35 categories...");
  try {
    const result = await syncCatholicHubSongs("all", userId);
    const totalSynced = result.totalSongsSynced;
    await statusRef.set(
      { lastSuccessAt: new Date().toISOString(), totalSongsSynced: totalSynced, syncedBy: userId },
      { merge: true }
    );
    console.log(`[Songs Monthly] sync complete — ${totalSynced} songs across ${result.categories.length} categories.`);
  } catch (e: any) {
    console.warn("[Songs Monthly] sync failed:", e?.message);
  }
}

function startCatholicHubSchedule() {
  // Daily content (news/articles) sync at IST 03:00
  scheduleDailyAt(3, "catholic-hub-content-0300", () => {
    void syncCatholicHubContent("system-scheduled").then((r) =>
      console.log(`[Catholic Hub] content sync done — ${r.itemsSynced} items in ${r.durationMs}ms`)
    ).catch((e: any) =>
      console.warn("[Catholic Hub] content sync failed:", e?.message)
    );
  });

  // Monthly song sync check — runs daily at IST 04:00 but skips if < 30 days since last success
  scheduleDailyAt(4, "songs-monthly-check-0400", () => {
    void runMonthlySongSyncIfNeeded("system-monthly");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER FREE-TIER KEEP-ALIVE
// Render spins down free services after 15 min of inactivity, which would kill
// the node process and lose the scheduler timers. We self-ping /api/health
// every 10 minutes to prevent spin-down.
// ─────────────────────────────────────────────────────────────────────────────
function startKeepAlive() {
  const selfUrl = process.env.RENDER_EXTERNAL_URL
    || process.env.APP_URL?.replace("web.app", "onrender.com")
    || null;

  if (!selfUrl) {
    console.log("[KeepAlive] RENDER_EXTERNAL_URL not set — skipping self-ping (local dev mode).");
    return;
  }

  const pingUrl = `${selfUrl}/api/health`;
  setInterval(async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      await fetch(pingUrl, { signal: ctrl.signal });
      clearTimeout(t);
      console.log(`[KeepAlive] ping ok → ${pingUrl}`);
    } catch {
      // non-fatal — next ping will catch it
    }
  }, 10 * 60 * 1000); // every 10 minutes
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER STARTUP
// ─────────────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`[Choir360 X] Server listening on port ${port}`);

  // 1. Keep Render free dyno alive
  startKeepAlive();

  // 2. Daily Gospel / Mass Readings — 3× per day
  startReadingsSchedule();

  // 3. Catholic Hub (catholictamil.com) — once per day + startup
  void syncCatholicHubOnStartup(); // immediate, non-blocking
  startCatholicHubSchedule();

  console.log("[Choir360 X] Sync schedulers started.");
});

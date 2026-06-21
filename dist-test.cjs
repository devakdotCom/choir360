var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config({ path: ".env.local" });
import_dotenv.default.config();
var app = (0, import_express.default)();
var isProd = process.env.NODE_ENV === "production";
app.use((0, import_helmet.default)({
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
        "wss://*.firebaseio.com"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProd ? [] : void 0
    }
  } : false,
  // Relaxed in dev to allow Vite HMR
  crossOriginEmbedderPolicy: false
}));
var allowedOrigins = [
  process.env.APP_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://choir360x.web.app",
  "https://choir360x.firebaseapp.com"
].filter(Boolean);
app.use((0, import_cors.default)({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"]
}));
app.use(import_express.default.json({ limit: "512kb" }));
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "choir360-backend", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var apiLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  limit: 80,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment." }
});
var aiLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "AI rate limit reached. Please wait before sending another message." }
});
var uploadLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Upload rate limit reached. Please wait before uploading again." }
});
var perUserAiRequests = /* @__PURE__ */ new Map();
function requireUserAiQuota(req, res, next) {
  const uid = req.user?.uid;
  if (!uid) return next();
  const windowMs = 6e4;
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
setInterval(() => {
  const now = Date.now();
  for (const [uid, entry] of perUserAiRequests.entries()) {
    if (now > entry.resetAt) perUserAiRequests.delete(uid);
  }
}, 5 * 6e4);
app.use("/api", apiLimiter);
var firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
if (firebaseProjectId && import_firebase_admin.default.apps.length === 0) {
  import_firebase_admin.default.initializeApp({ projectId: firebaseProjectId });
}
async function requireFirebaseAuth(req, res, next) {
  if (!import_firebase_admin.default.apps.length) {
    return res.status(503).json({ error: "Firebase Admin is not configured on the server." });
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token) {
    return res.status(401).json({ error: "Missing Firebase ID token." });
  }
  try {
    req.user = await import_firebase_admin.default.auth().verifyIdToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid Firebase ID token." });
  }
}
function requireAdminRole(req, res, next) {
  const role = req.user?.role;
  if (!["super_admin", "diocese_admin", "parish_admin", "choir_admin"].includes(role)) {
    return res.status(403).json({ error: "Admin role is required to sync readings." });
  }
  return next();
}
function requireString(value, field, maxLength = 500) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${field} is required and must be under ${maxLength} characters.`);
  }
  return value.trim();
}
var ARULVAKKU_CALENDAR_URL = "https://www.arulvakku.com/calendar.php";
var DEFAULT_TENANT_CONTEXT = {
  tenantId: "demo-tenant",
  parishId: "st-thomas-cathedral",
  choirId: "cathedral-choir"
};
function getDateInIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(/* @__PURE__ */ new Date());
}
function normalizeReadingDate(value) {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getDateInIndia();
  return date;
}
function normalizeReadingLanguage(value) {
  return value === "en" ? "en" : "ta";
}
function getReadingDocId(date, language) {
  return language === "ta" ? date : `${date}_${language}`;
}
function stripHtmlToText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\r/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}
function findFirstIndex(text, aliases, fromIndex = 0) {
  return aliases.map((alias) => ({ alias, index: text.indexOf(alias, fromIndex) })).filter((item) => item.index >= 0).sort((a, b) => a.index - b.index)[0] ?? null;
}
function extractReadingSection(text, headings, stopHeadings) {
  const start = findFirstIndex(text, headings);
  if (!start) return void 0;
  const contentStart = start.index + start.alias.length;
  const stop = findFirstIndex(text, stopHeadings, contentStart);
  const rawContent = text.slice(contentStart, stop ? stop.index : text.length).trim();
  const lines = rawContent.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return void 0;
  const referenceLineIndex = lines.findIndex(
    (line) => /(\d+\s*[:.]\s*\d+|நூலிலிருந்து வாசகம்|எழுதிய தூய நற்செய்தியிலிருந்து|Psalm|Psalms?|Reading from|Gospel according)/i.test(line)
  );
  const reference = referenceLineIndex >= 0 ? lines[referenceLineIndex] : void 0;
  const textLines = lines.filter((_, index) => index !== referenceLineIndex);
  return {
    heading: start.alias,
    reference,
    text: textLines.join("\n")
  };
}
function parseArulvakkuReadings(html, date, language, publicDisplay) {
  const text = stripHtmlToText(html);
  const titleMatch = text.match(/\d{1,2}\s+[^\n,]+(?:\s+\d{4})?,\s*[^\n]+/);
  const liturgicalDayMatch = text.match(/(?:####\s*)?([^\n]*(?:காலம்|வாரம்|திருநாள்|பெருவிழா|ஞாயிறு|வெள்ளி|சனி|திங்கள்|செவ்வாய்|புதன்|வியாழன்)[^\n]*)/);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const allHeadings = [
    "\u0BAE\u0BC1\u0BA4\u0BB2\u0BCD \u0BB5\u0BBE\u0B9A\u0B95\u0BAE\u0BCD",
    "\u0BAA\u0BA4\u0BBF\u0BB2\u0BC1\u0BB0\u0BC8\u0BAA\u0BCD \u0BAA\u0BBE\u0B9F\u0BB2\u0BCD",
    "\u0B87\u0BB0\u0BA3\u0BCD\u0B9F\u0BBE\u0BAE\u0BCD \u0BB5\u0BBE\u0B9A\u0B95\u0BAE\u0BCD",
    "\u0BA8\u0BB1\u0BCD\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC1\u0BA9\u0BCD \u0BB5\u0B9A\u0BA9\u0BAE\u0BCD",
    "\u0BA8\u0BB1\u0BCD\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC1\u0BA9\u0BCD \u0BB5\u0BBE\u0BB4\u0BCD\u0BA4\u0BCD\u0BA4\u0BCA\u0BB2\u0BBF",
    "\u0BA8\u0BB1\u0BCD\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBF \u0BB5\u0BBE\u0B9A\u0B95\u0BAE\u0BCD",
    "\u0B9A\u0BBF\u0BA8\u0BCD\u0BA4\u0BA9\u0BC8",
    "\u0BB5\u0BBE\u0B9A\u0B95\u0B99\u0BCD\u0B95\u0BB3\u0BCD",
    "First Reading",
    "Responsorial Psalm",
    "Second Reading",
    "Gospel Acclamation",
    "Gospel",
    "Reflection"
  ];
  const firstReading = extractReadingSection(text, ["\u0BAE\u0BC1\u0BA4\u0BB2\u0BCD \u0BB5\u0BBE\u0B9A\u0B95\u0BAE\u0BCD", "First Reading"], allHeadings.filter((heading) => !["\u0BAE\u0BC1\u0BA4\u0BB2\u0BCD \u0BB5\u0BBE\u0B9A\u0B95\u0BAE\u0BCD", "First Reading"].includes(heading)));
  const psalm = extractReadingSection(text, ["\u0BAA\u0BA4\u0BBF\u0BB2\u0BC1\u0BB0\u0BC8\u0BAA\u0BCD \u0BAA\u0BBE\u0B9F\u0BB2\u0BCD", "Responsorial Psalm"], allHeadings.filter((heading) => !["\u0BAA\u0BA4\u0BBF\u0BB2\u0BC1\u0BB0\u0BC8\u0BAA\u0BCD \u0BAA\u0BBE\u0B9F\u0BB2\u0BCD", "Responsorial Psalm"].includes(heading)));
  const secondReading = extractReadingSection(text, ["\u0B87\u0BB0\u0BA3\u0BCD\u0B9F\u0BBE\u0BAE\u0BCD \u0BB5\u0BBE\u0B9A\u0B95\u0BAE\u0BCD", "Second Reading"], allHeadings.filter((heading) => !["\u0B87\u0BB0\u0BA3\u0BCD\u0B9F\u0BBE\u0BAE\u0BCD \u0BB5\u0BBE\u0B9A\u0B95\u0BAE\u0BCD", "Second Reading"].includes(heading)));
  const gospelAcclamation = extractReadingSection(text, ["\u0BA8\u0BB1\u0BCD\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC1\u0BA9\u0BCD \u0BB5\u0B9A\u0BA9\u0BAE\u0BCD", "\u0BA8\u0BB1\u0BCD\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC1\u0BA9\u0BCD \u0BB5\u0BBE\u0BB4\u0BCD\u0BA4\u0BCD\u0BA4\u0BCA\u0BB2\u0BBF", "Gospel Acclamation"], allHeadings.filter((heading) => !["\u0BA8\u0BB1\u0BCD\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC1\u0BA9\u0BCD \u0BB5\u0B9A\u0BA9\u0BAE\u0BCD", "\u0BA8\u0BB1\u0BCD\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC1\u0BA9\u0BCD \u0BB5\u0BBE\u0BB4\u0BCD\u0BA4\u0BCD\u0BA4\u0BCA\u0BB2\u0BBF", "Gospel Acclamation"].includes(heading)));
  const gospel = extractReadingSection(text, ["\u0BA8\u0BB1\u0BCD\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBF \u0BB5\u0BBE\u0B9A\u0B95\u0BAE\u0BCD", "Gospel"], allHeadings.filter((heading) => !["\u0BA8\u0BB1\u0BCD\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBF \u0BB5\u0BBE\u0B9A\u0B95\u0BAE\u0BCD", "Gospel"].includes(heading)));
  const reflection = extractReadingSection(text, ["\u0B9A\u0BBF\u0BA8\u0BCD\u0BA4\u0BA9\u0BC8", "Reflection"], ["\u0BB5\u0BBE\u0B9A\u0B95\u0B99\u0BCD\u0B95\u0BB3\u0BCD", "\u0BAA\u0BBF\u0BB1 \u0BA8\u0BBE\u0B9F\u0BCD\u0B95\u0BB3\u0BCD"]);
  return {
    id: getReadingDocId(date, language),
    date,
    language,
    title: language === "ta" ? "\u0B87\u0BA9\u0BCD\u0BB1\u0BC8\u0BAF \u0BA4\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BB2\u0BBF \u0BB5\u0BBE\u0B9A\u0B95\u0B99\u0BCD\u0B95\u0BB3\u0BCD" : "Today's Mass Readings",
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
    ...DEFAULT_TENANT_CONTEXT
  };
}
async function fetchArulvakkuReading(date, language, publicDisplay = true) {
  if (language !== "ta") {
    throw new Error("English daily readings are prepared for future source integration.");
  }
  const response = await fetch(ARULVAKKU_CALENDAR_URL, {
    headers: {
      "User-Agent": "Choir360/1.0 (+daily-readings-sync)",
      "Accept": "text/html,application/xhtml+xml"
    }
  });
  if (!response.ok) {
    throw new Error(`Arulvakku source returned HTTP ${response.status}.`);
  }
  const html = await response.text();
  return parseArulvakkuReadings(html, date, language, publicDisplay);
}
async function readStoredDailyReading(date, language) {
  if (!import_firebase_admin.default.apps.length) return null;
  try {
    const snap = await import_firebase_admin.default.firestore().collection("dailyReadings").doc(getReadingDocId(date, language)).get();
    return snap.exists ? snap.data() : null;
  } catch (error) {
    console.warn("Daily readings Firestore read skipped:", error?.message || error);
    return null;
  }
}
async function writeStoredDailyReading(reading, userId = "arulvakku-sync") {
  if (!import_firebase_admin.default.apps.length) return reading;
  try {
    const existing = await import_firebase_admin.default.firestore().collection("dailyReadings").doc(reading.id).get();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const payload = {
      ...reading,
      createdAt: existing.exists ? existing.data()?.createdAt || reading.createdAt : reading.createdAt,
      createdBy: existing.exists ? existing.data()?.createdBy || reading.createdBy : userId,
      updatedAt: now,
      updatedBy: userId
    };
    await import_firebase_admin.default.firestore().collection("dailyReadings").doc(reading.id).set(payload, { merge: true });
    return payload;
  } catch (error) {
    console.warn("Daily readings Firestore write skipped:", error?.message || error);
    return reading;
  }
}
var aiInstance = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    console.warn("GEMINI_API_KEY is not defined or is a placeholder. Choir360 will operate in high-precision simulated AI mode.");
    return null;
  }
  if (!aiInstance) {
    aiInstance = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiInstance;
}
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
  } catch (error) {
    const cached = await readStoredDailyReading(date, language);
    if (cached) {
      return res.json({
        reading: {
          ...cached,
          syncStatus: "cached",
          syncMessage: `Showing cached readings. Latest sync failed: ${error.message}`
        }
      });
    }
    return res.status(502).json({
      error: error.message || "Daily readings could not be synced.",
      sourceUrl: ARULVAKKU_CALENDAR_URL
    });
  }
});
app.post("/api/bible/daily-readings/sync", requireFirebaseAuth, requireAdminRole, async (req, res) => {
  const date = normalizeReadingDate(req.body?.date);
  const language = normalizeReadingLanguage(req.body?.language);
  const publicDisplay = req.body?.publicDisplay !== false;
  try {
    const synced = await fetchArulvakkuReading(date, language, publicDisplay);
    const stored = await writeStoredDailyReading(synced, req.user?.uid || "admin-sync");
    return res.json({ reading: stored });
  } catch (error) {
    const cached = await readStoredDailyReading(date, language);
    if (cached) {
      await writeStoredDailyReading({
        ...cached,
        syncStatus: "failed",
        syncMessage: error.message || "Sync failed.",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, req.user?.uid || "admin-sync");
    }
    return res.status(502).json({ error: error.message || "Daily readings sync failed." });
  }
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
  const timestamp = Math.round(Date.now() / 1e3);
  const tagString = Array.isArray(tags) ? tags.join(",") : String(tags);
  const contextString = Object.entries(context).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("|");
  const paramsToSign = {
    context: contextString,
    folder,
    tags: tagString,
    timestamp
  };
  const signatureBase = Object.keys(paramsToSign).sort().map((key) => `${key}=${paramsToSign[key]}`).join("&");
  const signature = import_crypto.default.createHash("sha1").update(`${signatureBase}${apiSecret}`).digest("hex");
  return res.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    tags: tagString,
    context: contextString,
    signature
  });
});
app.post("/api/gemini/assistant", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  let message;
  try {
    message = requireString(req.body?.message, "message", 3e3);
  } catch (error) {
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
      let prompt = `${systemInstruction}

`;
      if (chatHistory.length > 0) {
        prompt += "Previous conversation history:\n";
        chatHistory.forEach((h) => {
          prompt += `${h.role === "user" ? "User" : "Assistant"}: ${h.content}
`;
        });
      }
      prompt += `
User asks: ${message}
Response:`;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });
      return res.json({ text: response.text || "I apologize, I could not generate a response." });
    } else {
      return res.json({
        text: getSimulatedAssistantResponse(message, activeRole, language),
        simulated: true
      });
    }
  } catch (error) {
    console.error("Gemini Assistant Error:", error);
    res.status(500).json({
      error: "Error generating response",
      details: error.message,
      text: "Peace be with you. I am currently adjusting my vocal harmonies (the Gemini API key appears misconfigured or timed out). Let me answer using my local liturgical database:\n\n" + getSimulatedAssistantResponse(message, activeRole, language)
    });
  }
});
app.post("/api/gemini/recommend", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  const { massType, season, language = "English", choirStrength = "balanced", customPrompt = "" } = req.body;
  try {
    requireString(massType, "massType", 120);
    requireString(season, "season", 120);
  } catch (error) {
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
          responseMimeType: "application/json"
        }
      });
      const text = response.text || "{}";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return res.json(JSON.parse(cleanJson));
    } else {
      return res.json(getSimulatedRecommendations(massType, season, language));
    }
  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    return res.json(getSimulatedRecommendations(massType, season, language));
  }
});
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
          responseMimeType: "application/json"
        }
      });
      const text = response.text || "{}";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return res.json(JSON.parse(cleanJson));
    } else {
      return res.json(getSimulatedOptimization(members, massDetails));
    }
  } catch (error) {
    console.error("Gemini Optimize Error:", error);
    return res.json(getSimulatedOptimization(members, massDetails));
  }
});
app.post("/api/gemini/generate-content", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  const { type, details, language = "en" } = req.body;
  try {
    requireString(type, "type", 80);
    requireString(details, "details", 3e3);
  } catch (error) {
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
          responseMimeType: "application/json"
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
app.post("/api/gemini/smart-search", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  const { query, songsList } = req.body;
  try {
    requireString(query, "query", 200);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!Array.isArray(songsList) || songsList.length > 500) {
    return res.status(400).json({ error: "songsList must be an array with at most 500 records." });
  }
  const prompt = `
    We operate a Roman Catholic Song Smart Search Engine with phonetic transliteration.
    User query: "${query}"
    Available Choir Songs database: ${JSON.stringify(songsList)}
    
    Please perform:
    1. Search only within the provided song records.
    2. Match title, category, author/composer, lyrics, transliteration, and sourceSearchText when present.
    3. Return only IDs that exist in the provided database.
    
    Return a ranked array of Song IDs from the provided database that best match the user's search query, and a short explanation for why it matches.
    
    Return JSON with this structure:
    {
      "matchedSongIds": ["JJ001", "JJ002"],
      "searchMethod": "PDF Songbook Full-Text Match",
      "explanation": "Matched the query against the imported PDF songbook index."
    }
    Return ONLY JSON. No markdown wrapper.
  `;
  try {
    const ai = getGeminiClient();
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const text = response.text || "{}";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return res.json(JSON.parse(cleanJson));
    } else {
      return res.json(getSimulatedSmartSearch(query, songsList));
    }
  } catch (error) {
    console.error("Gemini Smart Search Error:", error);
    return res.json(getSimulatedSmartSearch(query, songsList));
  }
});
app.post("/api/gemini/liturgical-plan", aiLimiter, requireFirebaseAuth, requireUserAiQuota, async (req, res) => {
  const { feast, date } = req.body;
  if (!feast) return res.status(400).json({ error: "feast is required." });
  const prompt = `
You are an expert Roman Catholic liturgical music director specialising in Tamil Catholic worship.
Generate a detailed Mass song program for:
Feast/Occasion: ${feast}
Date: ${date || "upcoming Sunday"}

Respond ONLY with a JSON object matching this exact schema:
{
  "feast": "string",
  "date": "string",
  "season": "Advent | Christmas | Ordinary Time | Lent | Easter | Triduum",
  "vestmentColor": "string",
  "readings": [
    { "ref": "scripture reference", "theme": "one sentence summary" }
  ],
  "homilySuggestion": "2\u20133 sentence homily direction",
  "songs": [
    {
      "position": "Mass part name (with Tamil equivalent)",
      "tamilTitle": "song title in Tamil script",
      "englishTitle": "transliterated title",
      "composer": "composer name",
      "rationale": "why this song fits this position liturgically",
      "liturgicalFit": "Perfect | Good | Acceptable"
    }
  ],
  "choirNotes": "practical director notes for this celebration"
}
Suggest positions and selection criteria; final song titles must come from the imported PDF Music Library.
Cover: Entrance, Kyrie, Gloria, Offertory, Communion, Thanksgiving, Recessional at minimum.
`;
  const geminiClient = getGeminiClient();
  if (geminiClient) {
    try {
      const response = await geminiClient.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      const text = response.text ?? "{}";
      const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return res.json(JSON.parse(clean));
    } catch (err) {
      console.error("Liturgical Planner AI Error:", err);
    }
  }
  return res.json({
    feast,
    date,
    season: "Ordinary Time",
    vestmentColor: "Green",
    readings: [{ ref: "See Lectionary", theme: "God calls us to faithfulness in daily life" }],
    homilySuggestion: "Reflect on the readings and how they speak to the local community.",
    songs: [
      { position: "Entrance", tamilTitle: "Select from imported songbook", englishTitle: "Imported PDF song page", composer: "Unknown", rationale: "Choose a suitable opening hymn from the PDF Music Library.", liturgicalFit: "Acceptable" },
      { position: "Offertory", tamilTitle: "Select from imported songbook", englishTitle: "Imported PDF song page", composer: "Unknown", rationale: "Choose a song that supports offering and thanksgiving.", liturgicalFit: "Acceptable" },
      { position: "Communion", tamilTitle: "Select from imported songbook", englishTitle: "Imported PDF song page", composer: "Unknown", rationale: "Choose a reverent Eucharistic song from the imported PDF.", liturgicalFit: "Acceptable" }
    ],
    choirNotes: "Plan well in advance and select exact song pages from the imported PDF Music Library."
  });
});
function getSimulatedAssistantResponse(message, role, lang) {
  const query = message.toLowerCase();
  const wantsSongs = query.includes("song") || query.includes("hymn") || query.includes("recommend") || query.includes("music") || query.includes("lyrics");
  if (wantsSongs) {
    return "Peace be with you. The Music Library is now sourced only from the imported Jebathotta Jeyageethangal PDF. Open Music Library, search the imported songbook, and select the exact PDF page for the Mass part you need. I will not suggest removed demo songs.";
  }
  return "Peace be with you! I am your **Choir360 Liturgical Assistant**. I can help with Catholic liturgical planning, choir roster balance, member coordination, and selecting songs from the imported PDF Music Library.";
}
function getSimulatedRecommendations(massType, season, language) {
  return {
    explanation: `Liturgical guidelines for ${massType} during the ${season} season. Select the final hymns from the imported PDF Music Library so the plan stays aligned with the current source of truth.`,
    recommendedSongs: [
      { type: "Entrance Hymn", title: "Select from imported songbook", liturgicalReasoning: "Choose a suitable opening hymn from the provided PDF source." },
      { type: "Offertory Hymn", title: "Select from imported songbook", liturgicalReasoning: "Choose a song that supports offering and thanksgiving." },
      { type: "Communion Hymn", title: "Select from imported songbook", liturgicalReasoning: "Choose a reverent Eucharistic song from the imported PDF." },
      { type: "Recessional Hymn", title: "Select from imported songbook", liturgicalReasoning: "Choose a sending hymn from the PDF Music Library." }
    ]
  };
}
function getSimulatedOptimization(members, massDetails) {
  const activeMembers = members.filter((m) => m.status === "Active Member");
  const keyboardist = activeMembers.find((m) => m.memberType === "Keyboard");
  const sopranos = activeMembers.filter((m) => m.voiceType === "Soprano");
  const altos = activeMembers.filter((m) => m.voiceType === "Alto");
  const tenors = activeMembers.filter((m) => m.voiceType === "Tenor");
  const basses = activeMembers.filter((m) => m.voiceType === "Bass");
  const alerts = [];
  const suggestions = [];
  let score = 90;
  if (!keyboardist) {
    alerts.push("CRITICAL ACTION REQUIRED: No Keyboardist scheduled. Choral guidance is at severe risk.");
    suggestions.push("Urgent: Contact Member Amal Joseph (M003) or request backup organist from secondary parish list.");
    score -= 30;
  } else {
    suggestions.push(`Keyboardist confirmed: ${keyboardist.firstName} ${keyboardist.lastName} has confirmed attendance.`);
  }
  if (sopranos.length === 0) {
    alerts.push("Warning: Soprano register is unstaffed. Lead melodies will be heavy or lacking high-register support.");
    score -= 15;
  } else {
    suggestions.push(`Soprano register is secured by ${sopranos.map((s) => s.firstName).join(", ")}.`);
  }
  if (tenors.length === 0 || basses.length === 0) {
    alerts.push("Warning: Male harmonic registers (Tenor/Bass) are understaffed.");
    score -= 10;
  }
  suggestions.push("Ensure Violin leads counter-melodies during Offertory to fill the high-wind frequency range.");
  suggestions.push("Prioritize standard a-cappella transition during Communion to let vocal registers resonate naturally.");
  return {
    balanceScore: Math.max(score, 40),
    evaluation: "Choir line-up analyzed for liturgical compliance. Overall voice mix is robust but requires attention for missing supporting keys or specific vocal solo segments.",
    vocalBalanceStatus: `${sopranos.length} Soprano, ${altos.length} Alto, ${tenors.length} Tenor, ${basses.length} Bass scheduled.`,
    instrumentalStatus: `${keyboardist ? "Keyboard Active" : "No Keyboardist"} | Violin/Flute checking.`,
    suggestedRosterIds: activeMembers.slice(0, 5).map((m) => m.id),
    structuralSuggestions: suggestions,
    safetyAlerts: alerts
  };
}
function getSimulatedContentGen(type, details, language) {
  const isTamil = language.toLowerCase() === "ta";
  if (type === "birthdayWish") {
    return {
      subject: isTamil ? "\u0B87\u0BA9\u0BBF\u0BAF \u0B95\u0BA4\u0BCD\u0BA4\u0BCB\u0BB2\u0BBF\u0B95\u0BCD\u0B95 \u0BAA\u0BBE\u0B9F\u0B95 \u0B89\u0BB1\u0BB5\u0BC1 \u0BAA\u0BBF\u0BB1\u0BA8\u0BCD\u0BA4\u0BA8\u0BBE\u0BB3\u0BCD \u0BB5\u0BBE\u0BB4\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BB3\u0BCD!" : "Blessed Birthday Wishes from Choir360!",
      body: isTamil ? `\u0B85\u0BA9\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4 \u0BAA\u0BBE\u0B9F\u0B95\u0BB0\u0BCD \u0B95\u0BC1\u0BB4\u0BC1 \u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0BA9\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BC1,

"${details || "\u0B8E\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0BC1\u0B9F\u0BC1\u0BAE\u0BCD\u0BAA \u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0BA9\u0BB0\u0BCD"}" \u0B86\u0B95\u0BBF\u0BAF \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1, \u0B8E\u0B99\u0BCD\u0B95\u0BB3\u0BA4\u0BC1 \u0BAA\u0BC1\u0BA9\u0BBF\u0BA4 \u0BA4\u0BCB\u0BAE\u0BC8\u0BAF\u0BBE\u0BB0\u0BCD \u0BAA\u0BC7\u0BB0\u0BBE\u0BB2\u0BAF\u0BAA\u0BCD \u0BAA\u0BBE\u0B9F\u0B95\u0BB0\u0BCD \u0B95\u0BC1\u0BB4\u0BC1 \u0B9A\u0BBE\u0BB0\u0BCD\u0BAA\u0BBF\u0BB2\u0BCD \u0B86\u0B9A\u0BC0\u0BB0\u0BCD\u0BB5\u0BA4\u0BBF\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F \u0BAA\u0BBF\u0BB1\u0BA8\u0BCD\u0BA4\u0BA8\u0BBE\u0BB3\u0BCD \u0BA8\u0BB2\u0BCD\u0BB5\u0BBE\u0BB4\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BB3\u0BC8\u0B95\u0BCD \u0BA4\u0BC6\u0BB0\u0BBF\u0BB5\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD \u0B95\u0BCA\u0BB3\u0BCD\u0B95\u0BBF\u0BB1\u0BCB\u0BAE\u0BCD.

\u0B87\u0BB1\u0BC8\u0BB5\u0BA9\u0BCD \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0BA8\u0BB2\u0BCD\u0BB2 \u0B9A\u0BC1\u0B95\u0BA4\u0BCD\u0BA4\u0BC8\u0BAF\u0BC1\u0BAE\u0BCD, \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC1 \u0BAA\u0BBE\u0B9F\u0BBF\u0BAA\u0BCD \u0BAA\u0BC1\u0B95\u0BB4\u0BC1\u0BAE\u0BCD \u0BAE\u0BC7\u0BB2\u0BBE\u0BA9 \u0B95\u0BC1\u0BB0\u0BB2\u0BCD \u0BA4\u0BBF\u0BB1\u0BA9\u0BC8\u0BAF\u0BC1\u0BAE\u0BCD \u0BA4\u0BA8\u0BCD\u0BA4\u0BB0\u0BC1\u0BB3\u0BC1\u0BB5\u0BBE\u0BB0\u0BBE\u0B95! \u0BAE\u0BB0\u0BBF\u0BAF\u0BBE\u0BB3\u0BBF\u0BA9\u0BCD \u0BAA\u0BB0\u0BBF\u0BA8\u0BCD\u0BA4\u0BC1\u0BB0\u0BC8 \u0B8E\u0BA9\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCB\u0B9F\u0BC1 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0B9F\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD.` : `Dear Beloved Choir Member,

We send you our prayerful congratulations on your birthday! Thank you for dedicating your voices and musical talents to glorify God and lead our congregation in prayer.

May the Lord bless you abundantly, grant you strength, and fill your days with holy joy. Happy Birthday!`,
      closing: isTamil ? "\u0B85\u0BA9\u0BCD\u0BAA\u0BC1\u0B9F\u0BA9\u0BCD, \u0BA4\u0BA8\u0BCD\u0BA4\u0BC8 \u0BAA\u0B99\u0BCD\u0B95\u0BC1\u0BA4\u0BCD\u0BA4\u0BA8\u0BCD\u0BA4\u0BC8 \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BAA\u0BBE\u0B9F\u0B95\u0BB0\u0BCD \u0B95\u0BC1\u0BB4\u0BC1 \u0B87\u0BAF\u0B95\u0BCD\u0B95\u0BC1\u0BA9\u0BB0\u0BCD" : "In St. Cecilia, Choir Director & Choral Ministry Team"
    };
  }
  return {
    subject: isTamil ? "\u0BA4\u0BC7\u0BB5\u0BBE\u0BB2\u0BAF \u0BAA\u0BBE\u0B9F\u0B95\u0BB0\u0BCD \u0B95\u0BC1\u0BB4\u0BC1 \u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B85\u0BB1\u0BBF\u0BB5\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1" : "Important Choral Announcement",
    body: isTamil ? `\u0B85\u0BA9\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4 \u0BAA\u0BBE\u0B9F\u0B95\u0BB0\u0BCD\u0B95\u0BB3\u0BC7,

\u0BA4\u0BAF\u0BB5\u0BC1\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BC1 \u0B95\u0BB5\u0BA9\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD: ${details || "\u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BB5\u0BB0\u0BC1\u0BAE\u0BCD \u0BA8\u0BB1\u0BCD\u0B95\u0BB0\u0BC1\u0BA3\u0BC8 \u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBE\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BA4\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BB2\u0BBF \u0BAA\u0BAF\u0BBF\u0BB1\u0BCD\u0B9A\u0BBF."}

\u0B85\u0BA9\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1 \u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0BA9\u0BB0\u0BCD\u0B95\u0BB3\u0BC1\u0BAE\u0BCD 30 \u0BA8\u0BBF\u0BAE\u0BBF\u0B9F\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC1\u0BA9\u0BCD\u0BAA\u0BBE\u0B95\u0BB5\u0BC7 \u0BA4\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1\u0BB0\u0BBF\u0BAF \u0B89\u0B9F\u0BC8\u0B95\u0BB3\u0BC1\u0B9F\u0BA9\u0BCD \u0BA4\u0BC7\u0BB5\u0BBE\u0BB2\u0BAF \u0BAE\u0BC7\u0B9F\u0BC8\u0BAF\u0BBF\u0BB2\u0BCD \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BC1\u0BAE\u0BBE\u0BB1\u0BC1 \u0B95\u0BC7\u0B9F\u0BCD\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BCA\u0BB3\u0BCD\u0BB3\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0B95\u0BBF\u0BB1\u0BC0\u0BB0\u0BCD\u0B95\u0BB3\u0BCD.` : `Dear Choral Members,

Kindly note the following: ${details || "Upcoming Solemn Mass preparations and standard rehearsals"}.

Please ensure your attendance is marked and you arrive wearing the mandated Parish green/white unified choir uniform.`,
    closing: "Choir360 Administration Core Team"
  };
}
function getSimulatedSmartSearch(query, songsList) {
  const q = query.toLowerCase().trim();
  const matched = (songsList || []).filter((song) => {
    const searchable = [
      song.id,
      song.title,
      song.lyricsTitle,
      song.category,
      song.album,
      song.composer,
      song.singer,
      song.lyrics,
      song.lyricsEnglishPattern,
      song.sourceSearchText
    ].filter(Boolean).join("\n").toLowerCase();
    return searchable.includes(q);
  });
  return {
    matchedSongIds: matched.map((song) => song.id).slice(0, 20),
    searchMethod: "PDF Songbook Full-Text Search",
    explanation: matched.length > 0 ? `Found ${matched.length} imported PDF song page(s) matching "${query}".` : `No imported PDF song pages found for "${query}".`
  };
}
function startServer() {
  const PORT = parseInt(process.env.PORT ?? "3001", 10);
  app.listen(PORT, () => {
    console.log(`[Choir360 X] Server running on port ${PORT}`);
    console.log(`[Choir360 X] Firebase Admin: ${import_firebase_admin.default.apps.length > 0 ? "Initialized" : "Not configured (demo mode)"}`);
    console.log(`[Choir360 X] Gemini AI: ${getGeminiClient() ? "Ready \u2014 gemini-2.0-flash" : "Not configured (simulated fallback)"}`);
  });
}
startServer();
//# sourceMappingURL=server-test.cjs.map

#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  CHOIR360 X — Production Deploy Script
#  Firebase Hosting (frontend) + Cloud Run (backend)
#
#  Prerequisites (run once):
#    npm install -g firebase-tools
#    gcloud auth login
#    gcloud config set project choir360x
#    gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
#      artifactregistry.googleapis.com
#
#  Uses Cloud Build (gcloud run deploy --source) — no local Docker required.
#
#  Set these env vars in your shell before running (or leave blank to skip):
#    export GEMINI_API_KEY="..."
#    export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
# ═══════════════════════════════════════════════════════════════

set -e

PROJECT_ID="choir360x"
REGION="asia-south1"
SERVICE_NAME="choir360-backend"

CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME:-dq4inx7d3}"
CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY:-522143587251288}"
CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET:-XNIfdRHZrHcMNrbI46KRt00_gC0}"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   CHOIR360 X — Production Deploy    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Step 1: Deploy backend to Cloud Run (via Cloud Build) ─────
echo "▶ Step 1/3: Deploying backend to Cloud Run (Cloud Build, no Docker needed)..."
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars GEMINI_API_KEY="${GEMINI_API_KEY}" \
  --set-env-vars CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME}" \
  --set-env-vars CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY}" \
  --set-env-vars CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET}" \
  --set-env-vars FIREBASE_SERVICE_ACCOUNT_JSON="${FIREBASE_SERVICE_ACCOUNT_JSON}"
echo "  ✓ Backend deployed"

# ── Step 2: Build frontend ──────────────────────────────────────
echo ""
echo "▶ Step 2/3: Building frontend (Vite)..."
npx vite build
echo "  ✓ Frontend built → dist/"

# ── Step 3: Deploy to Firebase Hosting ─────────────────────────
echo ""
echo "▶ Step 3/3: Deploying frontend to Firebase Hosting..."
npx firebase-tools deploy --only hosting --project ${PROJECT_ID}
echo "  ✓ Hosting live"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       ✓ DEPLOY COMPLETE              ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Frontend: https://${PROJECT_ID}.web.app"
echo "  Backend:  $(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')"
echo ""

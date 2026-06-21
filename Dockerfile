# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY server.ts ./

# Bundle server.ts → dist/server.cjs
RUN npx esbuild server.ts \
      --bundle \
      --platform=node \
      --format=cjs \
      --packages=external \
      --sourcemap \
      --outfile=dist/server.cjs

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist/server.cjs ./dist/server.cjs
COPY --from=builder /app/dist/server.cjs.map ./dist/server.cjs.map

EXPOSE 8080

CMD ["node", "dist/server.cjs"]

# syntax=docker/dockerfile:1

# Node 24 is required for the built-in `node:sqlite` module used at runtime.
# Multi-stage build → a slim, non-root standalone runtime image.

# ---- deps: install all deps (incl. dev) needed to build ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: produce the standalone server (.next/standalone) ----
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# dataset.json is committed and imported as a module, so no seed step is needed.
RUN npm run build

# ---- runner: minimal runtime, no build tooling, non-root ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output already contains the traced node_modules + server.js.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# ANTHROPIC_API_KEY is provided at runtime (docker run -e / compose), never baked in.
CMD ["node", "server.js"]

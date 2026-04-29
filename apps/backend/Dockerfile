# apps/backend/Dockerfile
# Build context: monorepo root (docker-compose sets context: .)

# ── Build stage ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests first (layer cache: rarely changes)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies (dev + prod)
RUN npm ci

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# Build shared package first, then backend
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/backend

# ── Runtime stage ──────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy node_modules from builder (workspace hoisting already resolved correctly)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy compiled artifacts from builder
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy package manifests (needed by Node workspace resolution at runtime)
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Copy runtime files needed by start.sh
COPY apps/backend/start.sh ./apps/backend/start.sh
COPY apps/backend/drizzle.config.ts ./apps/backend/drizzle.config.ts
COPY apps/backend/src/db/migrations ./apps/backend/src/db/migrations

# Fix ownership and make start.sh executable
RUN chown -R node:node /app && chmod +x /app/apps/backend/start.sh

# Set working directory and switch to non-root user
# WORKDIR must be /app/apps/backend so start.sh relative paths resolve correctly
WORKDIR /app/apps/backend
USER node

CMD ["sh", "start.sh"]

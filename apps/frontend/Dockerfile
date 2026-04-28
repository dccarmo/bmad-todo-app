# apps/frontend/Dockerfile
# Build context: monorepo root (docker-compose sets context: .)

# ── Build stage ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests first (layer cache: rarely changes)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/

# Install all dependencies
RUN npm ci

# Copy source files
# Vite alias resolves @todo-app/shared to packages/shared/src directly,
# so the TS source (not dist) is what the bundler needs
COPY packages/shared/ ./packages/shared/
COPY apps/frontend/ ./apps/frontend/

# Build frontend (tsc type-check + vite bundle → apps/frontend/dist/)
RUN npm run build --workspace=apps/frontend

# ── Serve stage ────────────────────────────────────────────
FROM nginx:alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

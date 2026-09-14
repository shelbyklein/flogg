# ---- build ----
FROM node:24-bookworm-slim AS build
RUN npm install -g pnpm@10
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

# vite.config.ts requires PORT and BASE_PATH even for builds
ENV NODE_ENV=production PORT=3000 BASE_PATH=/
RUN pnpm --filter @workspace/api-server run build \
 && pnpm --filter @workspace/filament-log run build

# ---- runtime ----
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/public \
    MIGRATIONS_DIR=/app/migrations \
    UPLOAD_DIR=/data/uploads

COPY --from=build /app/artifacts/api-server/dist ./dist
COPY --from=build /app/artifacts/filament-log/dist/public ./public
COPY --from=build /app/lib/db/migrations ./migrations

RUN mkdir -p /data/uploads && chown -R node:node /data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/index.mjs"]

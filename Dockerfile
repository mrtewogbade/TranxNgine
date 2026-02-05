FROM node:22-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---------- 1) Install all deps (dev + prod) ----------
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack prepare pnpm@10.14.0 --activate \
    && pnpm fetch \
    && pnpm install --frozen-lockfile

# ---------- 2) Build (NestJS build only) ----------
FROM deps AS build
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ---------- 3) Prune to production deps only ----------
FROM build AS prod-deps
WORKDIR /app

ENV HUSKY=0
RUN pnpm prune --prod

# ---------- 4) Runtime (PM2, non-root) ----------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update -y && apt-get install -y --no-install-recommends \
    libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

RUN npm i -g pm2@latest

RUN useradd -m -u 10001 nodeusr
RUN mkdir -p /app/logs && chown -R nodeusr:nodeusr /app/logs

COPY --chown=nodeusr:nodeusr --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nodeusr:nodeusr --from=build /app/dist ./dist
COPY --chown=nodeusr:nodeusr --from=build /app/package.json ./package.json
COPY --chown=nodeusr:nodeusr entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

USER nodeusr
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["./entrypoint.sh"]

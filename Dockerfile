# NAVISCOP — image de production.
# Contexte de build = racine du repo (contient app/ et finance-engine/).
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /repo

# Le moteur est une dépendance locale (link:../finance-engine).
COPY finance-engine ./finance-engine

WORKDIR /repo/app
COPY app/package.json ./package.json
COPY app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --no-frozen-lockfile

COPY app/ ./
RUN pnpm build

# --- Runtime ---
FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /repo
COPY --from=builder /repo/finance-engine ./finance-engine
WORKDIR /repo/app
COPY --from=builder /repo/app ./

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["pnpm", "start"]

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
# Config Supabase injectée au build (NEXT_PUBLIC_* = inlinée par Next).
# Vides par défaut -> l'app tourne en mode démo localStorage (ex. peduzzi.sbs).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
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

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && npm i; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prefeitura deste deploy (config/prefeituras/<slug>.json). Lida no build,
# pois a página é gerada estaticamente. No Coolify, cadastre PREFEITURA como
# variável de ambiente marcada como "Build Variable".
ARG PREFEITURA=aracaju
ENV PREFEITURA=$PREFEITURA
# Domínio público usado nos metadados (Open Graph). O Coolify fornece
# COOLIFY_URL; SITE_URL, se definida, tem prioridade.
ARG COOLIFY_URL
ARG SITE_URL
ENV COOLIFY_URL=$COOLIFY_URL SITE_URL=$SITE_URL

# Next.js collects completely anonymous telemetry data about general usage.
# https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else npm run build; \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ARG PREFEITURA=aracaju
ENV PREFEITURA=$PREFEITURA
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder /app/public ./public
# Garante que o CSS (Tailwind) e os chunks JS estáticos sejam servidos pelo Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js é criado pelo next build via output: "standalone"
# https://nextjs.org/docs/app/api-reference/config/next-config-js/output
CMD ["node", "server.js"]

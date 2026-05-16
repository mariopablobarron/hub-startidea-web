# syntax=docker/dockerfile:1.7
# Build optimizado para Next.js 15 standalone — Coolify (VPS Hostinger)

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_STANDALONE=1
# build script ejecuta `prisma generate && next build`
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
# openssl runtime para prisma migrate
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma: schema + migraciones (necesarios para `migrate deploy`).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Instalar Prisma CLI y engines en el runtime stage. Más robusto que
# copiar selectivamente del builder porque arrastra todas las
# dependencias transitivas (@prisma/engines, etc.).
RUN npm install -g prisma@6 && \
    chown -R nextjs:nodejs /usr/local/lib/node_modules/prisma && \
    chown -R nextjs:nodejs /usr/local/bin/prisma

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

CMD ["./docker-entrypoint.sh"]

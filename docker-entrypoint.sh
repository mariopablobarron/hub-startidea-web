#!/bin/sh
# Entrypoint del container hub-startidea-web.
# Ejecuta migraciones Prisma antes de arrancar Next.js — garantiza que la
# BD está al día con cada deploy. Si la migración falla, el container NO
# arranca (mejor que arrancar con esquema viejo y romper queries en runtime).

set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  # prisma instalado globalmente en el runtime stage (ver Dockerfile)
  prisma migrate deploy --schema /app/prisma/schema.prisma
else
  echo "[entrypoint] WARN DATABASE_URL no configurada — saltando migraciones"
fi

echo "[entrypoint] Starting Next.js..."
exec node server.js

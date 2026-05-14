#!/usr/bin/env bash
set -e

echo "▶ Aguardando Postgres em ${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}..."
until node -e "require('net').createConnection(${POSTGRES_PORT:-5432}, '${POSTGRES_HOST:-postgres}').on('connect', () => process.exit(0)).on('error', () => process.exit(1));" 2>/dev/null; do
  sleep 1
done
echo "✔ Postgres pronto."

if [ ! -d "node_modules/.prisma" ] && [ ! -d "node_modules/@prisma/client/.prisma" ]; then
  echo "▶ Garantindo dependências (volume novo detectado)..."
  npm install --no-audit --no-fund
fi

echo "▶ Gerando Prisma Client..."
npx prisma generate

echo "▶ Aplicando migrations (prisma migrate deploy)..."
npx prisma migrate deploy || {
  echo "⚠ migrate deploy falhou — tentando db push como fallback (dev)..."
  npx prisma db push --accept-data-loss
}

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "▶ Rodando seed..."
  npm run db:seed || echo "⚠ Seed falhou (já populado?), seguindo."
fi

echo "▶ Iniciando: $*"
exec "$@"

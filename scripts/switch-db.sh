#!/bin/bash
# ==============================================================
# switch-db.sh — สลับระหว่าง SQLite (local) กับ PostgreSQL (cloud)
# Usage: bash scripts/switch-db.sh local
#        bash scripts/switch-db.sh cloud
#        bash scripts/switch-db.sh status
# ==============================================================

set -e

SCHEMA="prisma/schema.prisma"
MODE="$1"

current_provider() {
  grep 'provider = ' "$SCHEMA" | grep -oP '"(sqlite|postgresql)"' | tr -d '"'
}

if [ "$MODE" = "status" ]; then
  echo "Current DB provider: $(current_provider)"
  grep "^DATABASE_URL" .env | head -1
  exit 0
fi

if [ "$MODE" = "local" ]; then
  echo "Switching to SQLite (local)..."

  # Update provider in schema
  sed -i 's/provider = "postgresql"/provider = "sqlite"/' "$SCHEMA"

  # Update DATABASE_URL and DIRECT_URL in .env
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL="file:./dev.db"|' .env
  sed -i 's|^DIRECT_URL=.*|DIRECT_URL="file:./dev.db"|' .env

  echo "  schema.prisma -> sqlite"
  echo "  .env -> file:./dev.db"

elif [ "$MODE" = "cloud" ]; then
  echo "Switching to PostgreSQL (cloud)..."

  # Update provider in schema
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA"

  # Read cloud URL from .env.cloud
  CLOUD_DB_URL=$(grep "^DATABASE_URL" .env.cloud | cut -d'=' -f2-)
  CLOUD_DIRECT_URL=$(grep "^DIRECT_URL" .env.cloud | cut -d'=' -f2-)

  # Update .env
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$CLOUD_DB_URL|" .env
  sed -i "s|^DIRECT_URL=.*|DIRECT_URL=$CLOUD_DIRECT_URL|" .env

  echo "  schema.prisma -> postgresql"
  echo "  .env -> Supabase cloud"

else
  echo "Usage: bash scripts/switch-db.sh [local|cloud|status]"
  echo ""
  echo "  local   - SQLite (file:./dev.db)"
  echo "  cloud   - PostgreSQL (Supabase)"
  echo "  status  - Show current DB mode"
  exit 1
fi

# Regenerate Prisma client
echo ""
echo "Running prisma generate..."
npx prisma generate

echo ""
echo "Done! Run 'pnpm run db:push' to sync schema."
echo "Current mode: $MODE ($(current_provider))"

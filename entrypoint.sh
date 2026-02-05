#!/usr/bin/env sh
set -e

# Check required DB env vars
if [ -z "${DB_HOST:-}" ] || [ -z "${DB_PORT:-}" ] || [ -z "${DB_USERNAME:-}" ] || [ -z "${DB_PASSWORD:-}" ] || [ -z "${DB_DATABASE:-}" ]; then
  echo "❌ Database environment variables are required (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE)"
  exit 1
fi

echo "→ Using database:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Name: $DB_DATABASE"
echo "   User: $DB_USERNAME"

echo "→ Running Sequelize migrations…"
npx sequelize-cli db:migrate

echo "→ Starting app with PM2…"
exec pm2-runtime dist/src/main.js

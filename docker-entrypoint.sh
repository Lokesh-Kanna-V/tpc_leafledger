#!/bin/sh
set -e

# Apply Prisma migrations on container start.
# If the database was created outside Prisma (non-empty), baseline the init migration once.
set +e
OUT="$(node ./node_modules/prisma/build/index.js migrate deploy 2>&1)"
CODE=$?
set -e

if [ "$CODE" -ne 0 ]; then
  echo "$OUT"
  echo "$OUT" | grep -q "P3005" || exit "$CODE"

  echo "[entrypoint] DB is not empty; baselining init migration and retrying..."
  node ./node_modules/prisma/build/index.js migrate resolve --applied 20260205140000_init
  node ./node_modules/prisma/build/index.js migrate deploy
fi

exec node server.js

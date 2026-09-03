#!/usr/bin/env bash
set -e



# Always run relative to this script's location, no matter where it's called from.
cd "$(dirname "$0")"

echo "==> Music Room backend startup"

# 1. Root dependencies (npm workspaces: installs api, web, types all at once)
if [ ! -d "node_modules" ]; then
  echo "==> node_modules missing, running npm install (this can take a while)..."
  npm install
else
  echo "==> Dependencies already installed, skipping npm install."
fi

# 2. Shared types package must be compiled before api/web can import it
if [ ! -d "packages/types/dist" ]; then
  echo "==> Building packages/types..."
  (cd packages/types && npm run build)
else
  echo "==> packages/types already built, skipping."
fi


# 3. Prisma client generation
echo "==> Generating Prisma client..."
(cd apps/api && npx prisma generate)



# 4. Database + migrations
if [ ! -f "apps/api/dev.db" ]; then
  echo "==> No local database found, setting it up..."
  if [ -d "apps/api/prisma/migrations" ] && [ -n "$(ls -A apps/api/prisma/migrations 2>/dev/null)" ]; then
    (cd apps/api && npx prisma migrate deploy)
  else
    (cd apps/api && npx prisma migrate dev --name init)
  fi
else
  echo "==> Database already exists, skipping migration."
fi

# 5. Ensure Redis is running (required by BullMQ job queue, see apps/api/src/app.module.ts)
echo "==> Ensuring Redis is running..."
if [ "$(docker ps -q -f name=music-room-redis)" ]; then
  echo "==> Redis already running."
elif [ "$(docker ps -aq -f name=music-room-redis)" ]; then
  echo "==> Starting existing Redis container..."
  docker start music-room-redis
else
  echo "==> Creating and starting Redis container..."
  docker run -d --name music-room-redis -p 6379:6379 redis
fi


# 6. Start the API (stays in foreground, logs stream here)
echo "==> Starting backend (npm run dev:api)..."
npm run dev

# (cd apps/api && (npm run build || true) && node dist/src/main.js)



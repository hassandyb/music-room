#!/usr/bin/env bash
set -e

# Always run relative to this script's location, no matter where it's called from.
cd "$(dirname "$0")"



echo "==> Music Room mobile startup"

# 1. Root dependencies (npm workspaces: installs api, web, mobile, types all at once)
if [ ! -d "node_modules" ]; then
  echo "==> node_modules missing, running npm install (this can take a while)..."
  npm install
else
  echo "==> Dependencies already installed, skipping npm install."
fi

# 2. Start Expo (scan the QR code with Expo Go, or press a/i for an emulator)
echo "==> Starting Expo (apps/mobile)..."
cd apps/mobile

# npx expo start -c --tunnel

#npx expo run:android

npx expo start -c --go --tunnel



# npx expo start 


#--------------   Notes   -------------------

#    docker compose logs -f api

#    nproc; free -h


# cd apps/api
# npx prisma migrate dev --name init
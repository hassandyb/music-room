#!/usr/bin/env bash
set -e

# Ubuntu only. Exposes the local nginx gateway (docker-compose.yaml, port
# 8000 - fronts both api and web) to the internet via ngrok, so the mobile
# app (run-mobile.sh) can reach it from a real device instead of localhost.
#
# After this prints the tunnel URL, put it in apps/mobile/.env as:
#   EXPO_PUBLIC_BACKEND_URL=https://<your-domain>.ngrok-free.dev
# then reload the app (press 'r' in the Expo terminal).
#
# Auth: set NGROK_AUTHTOKEN in apps/mobile/.env (gitignored) and this script
# applies it via `ngrok config add-authtoken`. Get it from the ngrok dashboard.

# Always run relative to this script's location, no matter where it's called from.
cd "$(dirname "$0")"

# 0. Env files (create them with defaults if missing) — kept out of git,
# recreated here so a fresh clone can run immediately.
#
# IMPORTANT: every value below marked ###### is a placeholder. Fill in your
# own before running the app — see the comment above each variable for what
# it is and where to get it.
if [ ! -f .env ]; then
  echo "==> .env missing, creating it..."
  cat > .env <<'EOF'
# Read by `docker compose` for ${VAR} substitution in docker-compose.yaml.
# Per-service runtime env lives in apps/api/.env and apps/web/.env instead
# (wired up via env_file: in docker-compose.yaml).
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=music_room
POSTGRES_PORT=5432

# Public origin of the nginx gateway — baked into the web build (browser-
# facing URLs) and used by the api for links it sends out (CORS, emails,
# OAuth redirects). Change this if you expose the stack on a different
# host/port than the default http://localhost.
#
# Must match the ngrok static domain you create below (NGROK_DOMAIN in
# apps/mobile/.env) — ngrok dashboard -> Domains -> New Domain (free tier
# gives you one static domain): https://dashboard.ngrok.com/domains
PUBLIC_URL=https://######.ngrok-free.dev
EOF
else
  echo "==> .env already exists, skipping."
fi

if [ ! -f apps/api/.env ]; then
  echo "==> apps/api/.env missing, creating it..."
  cat > apps/api/.env <<'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/music_room"
PORT=8080
REDIS_HOST="localhost"
REDIS_PORT=6379
# Any random string — used to sign JWTs. Fine to leave as-is for local dev.
JWT_SECRET="dev-only-secret-change-me"

# Same ngrok domain as PUBLIC_URL above (see: https://dashboard.ngrok.com/domains).
BACKEND_URL="https://######.ngrok-free.dev"
# Only the web OAuth callback uses this (see strategies/*-web.strategy.ts).
# Set to the ngrok tunnel so Google/Facebook redirect back through it instead
# of localhost. Must be registered as its own separate authorized redirect
# URI in the Google/Meta consoles, alongside BACKEND_URL's mobile callback.
WEB_BACKEND_URL="https://######.ngrok-free.dev"
WEB_URL="http://localhost:3000"
MOBILE_URL="http://localhost:8081"

# SMTP settings used to send verification/reset emails. With Gmail: enable
# 2FA on the account, then create an "App Password" at
# https://myaccount.google.com/apppasswords — use that (not your real
# password) as EMAIL_PASS.
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER="######@gmail.com"
EMAIL_PASS="######"
EMAIL_FROM_NAME="Music Room"

# Jamendo API client ID, used for one of the music search providers. Get a
# free one at https://devportal.jamendo.com (create an app -> Client ID).
# Leave as the placeholder to just disable Jamendo results.
JAMENDO_CLIENT_ID="dev-only-placeholder"

# Optional: unset means Google/Facebook OAuth2 login routes stay disabled.
# Google: https://console.cloud.google.com/apis/credentials
#   -> Create Credentials -> OAuth client ID -> Web application
# Facebook: https://developers.facebook.com/apps
#   -> Your app -> Settings -> Basic (App ID / App Secret)
# GOOGLE_CLIENT_ID="######"
# GOOGLE_CLIENT_SECRET="######"
# FACEBOOK_APP_ID="######"
# FACEBOOK_APP_SECRET="######"
EOF
else
  echo "==> apps/api/.env already exists, skipping."
fi

if [ ! -f apps/mobile/.env ]; then
  echo "==> apps/mobile/.env missing, creating it..."
  cat > apps/mobile/.env <<'EOF'
# Same ngrok domain as PUBLIC_URL above — this is what the phone actually
# talks to, since it can't reach your machine's localhost.
EXPO_PUBLIC_BACKEND_URL=https://######.ngrok-free.dev

# ngrok dashboard -> Your Authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
NGROK_AUTHTOKEN=######

# A free static domain reserved for your account, so the URL doesn't change
# every run. ngrok dashboard -> Domains -> New Domain: https://dashboard.ngrok.com/domains
NGROK_DOMAIN=######.ngrok-free.dev
EOF
else
  echo "==> apps/mobile/.env already exists, skipping."
fi

if [ ! -f apps/web/.env ]; then
  echo "==> apps/web/.env missing, creating it..."
  cat > apps/web/.env <<'EOF'
# Baked into the client bundle at build time (next build). Point these at
# nginx's public origin in Docker (see docker-compose.yaml build args); for
# local `npm run dev:web` the localhost:8080 defaults in code already match,
# so this file only needs to exist if you want to override them.
NEXT_PUBLIC_API_URL="http://localhost:8080"
NEXT_PUBLIC_SOCKET_URL="http://localhost:8080"

# Server-side only (Next.js middleware / route handlers) — where the web
# container reaches the api container. Not exposed to the browser.
API_INTERNAL_URL="http://localhost:8080"
EOF
else
  echo "==> apps/web/.env already exists, skipping."
fi



# Load NGROK_DOMAIN / NGROK_AUTHTOKEN from apps/mobile/.env
set -a
source apps/mobile/.env
set +a

PORT="${PORT:-8000}"
NGROK_DOMAIN="${NGROK_DOMAIN:-######.ngrok-free.dev}"
LOCAL_BIN="$HOME/.local/bin"

echo "==> Music Room ngrok tunnel startup"

# 1. Install ngrok if missing (no sudo: download the binary into ~/.local/bin)
export PATH="$LOCAL_BIN:$PATH"
if ! command -v ngrok >/dev/null 2>&1; then
  echo "==> ngrok not found, downloading to $LOCAL_BIN (no sudo needed)..."
  mkdir -p "$LOCAL_BIN"
  curl -sSL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
    | tar -xz -C "$LOCAL_BIN" ngrok
else
  echo "==> ngrok already installed, skipping."
fi

# 2. Apply authtoken if provided
if [ -n "${NGROK_AUTHTOKEN:-}" ]; then
  ngrok config add-authtoken "$NGROK_AUTHTOKEN"
fi

# 3. Start the tunnel (stays in foreground, logs stream here)
echo "==> Starting tunnel: https://$NGROK_DOMAIN -> localhost:$PORT"
ngrok http --url="$NGROK_DOMAIN" "$PORT"

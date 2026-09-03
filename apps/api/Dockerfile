# Build context is the repo root (npm workspaces need every workspace's
# package.json to resolve the dependency graph) — see docker-compose.yaml.
FROM node:22-alpine AS deps
WORKDIR /repo
# python3/make/g++ are needed to build native deps that ship in the
# workspace lockfile (e.g. msgpackr-extract, used by ioredis/bullmq).
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/types packages/types
RUN npm i

FROM deps AS build
COPY apps/api apps/api
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=backend

FROM node:22-alpine AS runner
WORKDIR /repo
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/types/dist ./packages/types/dist
COPY --from=build /repo/packages/types/package.json ./packages/types/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json

WORKDIR /repo/apps/api
EXPOSE 8080

# Uploads land in <cwd>/uploads/tracks (see LocalStorageService) — cwd here
# matches WORKDIR, so the docker-compose bind mount lines up.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]

# Build context is the repo root (npm workspaces need every workspace's
# package.json to resolve the dependency graph) — see docker-compose.yaml.
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/types packages/types
RUN npm i

FROM deps AS build
# Baked into the client bundle at build time — must point at the public
# (nginx) origin, not an internal container hostname the browser can't see.
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_SOCKET_URL=""
ARG NEXT_PUBLIC_BACKEND_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
COPY apps/web apps/web
RUN mkdir -p apps/web/public
RUN npm run build --workspace=frontend

FROM node:22-alpine AS runner
WORKDIR /repo/apps/web
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/web/.next/standalone /repo
COPY --from=build /repo/apps/web/public ./public
COPY --from=build /repo/apps/web/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]

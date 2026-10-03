# Web image for the production VPS (deploy/docker-compose.yml builds it).
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Read at BUILD time: `next build` bakes the /api rewrite destination into
# .next/routes-manifest.json and `next start` never re-reads it. Inside the
# compose network the API is the `api` service. (In production Caddy routes
# /api straight to the API, so this rewrite is a fallback, not the main path.)
ARG API_PROXY_TARGET=http://api:4000
ENV API_PROXY_TARGET=$API_PROXY_TARGET \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]

# Web image. In production Dokploy builds it from this folder (docs/DEPLOYMENT-VPS.md).
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Everything below is read at BUILD time, so it arrives as a build argument
# (Dokploy → the web app → Environment → Build-time arguments), not as a
# runtime variable: `next build` inlines NEXT_PUBLIC_* into the browser bundle
# and bakes the /api rewrite destination into .next/routes-manifest.json, and
# `next start` re-reads neither.
#
# Declared without defaults on purpose. An ARG that is not passed is simply
# absent from the build, so src/config/query.config.js falls back to its
# documented default — a default here would be a second copy of that value.
#
# API_PROXY_TARGET is the API container as seen from this one
# (http://<api app name>:4000). It is a fallback: in production Traefik routes
# /api straight to the API and the request never reaches Next.
ARG API_PROXY_TARGET
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_QUERY_STALE_TIME
ARG NEXT_PUBLIC_QUERY_GC_TIME
ARG NEXT_PUBLIC_QUERY_RETRY_COUNT
ARG NEXT_PUBLIC_QUERY_RETRY_DELAY
ARG NEXT_PUBLIC_QUERY_RETRY_DELAY_MAX
ARG NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS
ARG NEXT_PUBLIC_QUERY_REFETCH_ON_MOUNT
ARG NEXT_PUBLIC_QUERY_REFETCH_ON_RECONNECT
ARG NEXT_PUBLIC_QUERY_REFETCH_INTERVAL
ARG NEXT_PUBLIC_AUTH_STALE_TIME
ARG NEXT_PUBLIC_QUERY_STATIC_STALE_TIME
ARG NEXT_PUBLIC_QUERY_LIVE_INTERVAL
ARG NEXT_PUBLIC_MUTATION_RETRY_COUNT

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]

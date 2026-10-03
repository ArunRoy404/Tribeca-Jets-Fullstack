# API image for the production VPS (deploy/docker-compose.yml builds it).
#
# One stage, devDependencies kept. The container has to run three things
# besides the server, and all three live in devDependencies: `prisma migrate
# deploy` on every start, `tsx` for the first-admin bootstrap, and the
# generated client's TypeScript source that bootstrap imports. A pruned image
# would boot and then be unable to migrate itself.
#
# bookworm-slim, not alpine: argon2 ships prebuilt glibc binaries, and Prisma's
# schema engine needs OpenSSL.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `prisma generate` runs as prebuild and loads the Prisma config, which reads
# DATABASE_URL. Generating connects to nothing, so a placeholder is enough —
# the real value only exists at run time.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build

ENV NODE_ENV=production
EXPOSE 4000

# Migrations apply on every start, before the server listens. One API
# container, so there is no race between two of them migrating at once.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

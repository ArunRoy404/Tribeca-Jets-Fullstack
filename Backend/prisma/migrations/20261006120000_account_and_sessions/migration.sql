-- Auth review (6 Oct 2026): self-service account page and the sessions list.
--
-- Additive only — no column is dropped or renamed:
--   * `verification_codes.rememberMe` carries "Remember me" through two-factor.
--   * `refresh_tokens.sessionStartedAt` is when the sign-in happened, copied
--     forward on rotation. Existing rows are backfilled from `createdAt`, the
--     best value they have.
--   * `users.avatarUrl` holds the profile photo as an upload URL.

-- AlterTable
ALTER TABLE "verification_codes" ADD COLUMN "rememberMe" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN "sessionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "refresh_tokens" SET "sessionStartedAt" = "createdAt";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "avatarUrl" TEXT;

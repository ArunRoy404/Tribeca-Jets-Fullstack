-- Per-user permissions (owner's design, 7 Oct 2026). Null reads as the
-- role's defaults, so existing accounts keep working unchanged.
ALTER TABLE "users" ADD COLUMN "permissions" JSONB;

-- SENIOR_BROKER is withdrawn: it is not in the signed scope (§4). Anyone
-- holding it becomes a BROKER, then the enum is rebuilt without the value —
-- Postgres cannot drop a value from an enum in place.
UPDATE "users" SET "role" = 'BROKER' WHERE "role" = 'SENIOR_BROKER';

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'BROKER', 'ASSISTANT', 'REFERRAL_AGENT');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'BROKER';
DROP TYPE "UserRole_old";

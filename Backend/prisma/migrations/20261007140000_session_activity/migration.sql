-- The idle limit now reads real activity instead of the token's age.
-- Existing rows start from their last renewal, which is what the old check used.
ALTER TABLE "refresh_tokens" ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "refresh_tokens" SET "lastActiveAt" = "createdAt";

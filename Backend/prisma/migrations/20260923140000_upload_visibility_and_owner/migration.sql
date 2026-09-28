-- Gives an upload an access rule and an optional owner.
--
-- Until now a stored file was reachable by anyone with a session. That is
-- correct for an aircraft photograph and wrong for a broker's 1099, which is
-- the client's own example (adjustment #7).
--
-- `visibility` defaults to PRIVATE so the failure mode is "the brochure needs
-- a flag" rather than "the tax form was readable by everyone". Existing rows
-- are Postman probes and take the default; nothing is serving them.
--
-- `ownerUserId` is what makes a personal folder a query rather than a second
-- table: the folder is every live upload owned by that user.

-- CreateEnum
CREATE TYPE "UploadVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "uploads" ADD COLUMN     "label" VARCHAR(200),
ADD COLUMN     "ownerUserId" UUID,
ADD COLUMN     "visibility" "UploadVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateIndex
CREATE INDEX "uploads_ownerUserId_deletedAt_createdAt_idx" ON "uploads"("ownerUserId", "deletedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


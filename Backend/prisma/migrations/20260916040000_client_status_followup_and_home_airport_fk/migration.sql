-- Clients gain a relationship status, follow-up scheduling, and a real foreign
-- key to Airports in place of the ICAO string they carried before Airports
-- existed.

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('LEAD', 'ACTIVE', 'VIP', 'INACTIVE');

-- AlterTable: add the new columns first, so the old value can be carried over
-- before it is dropped.
ALTER TABLE "clients" ADD COLUMN     "followUpNote" TEXT,
ADD COLUMN     "homeAirportId" UUID,
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'LEAD';

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_homeAirportId_fkey" FOREIGN KEY ("homeAirportId") REFERENCES "airports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: resolve each stored ICAO to the airport row it names. Every
-- existing value matches a known airport, so nothing is lost; any that did not
-- match would simply be left null rather than failing the migration.
UPDATE "clients" c
SET "homeAirportId" = a."id"
FROM "airports" a
WHERE c."homeAirport" IS NOT NULL
  AND a."icao" = c."homeAirport";

-- Existing clients are real relationships, not fresh leads. The column default
-- (LEAD) is right for rows created from here on; these predate the field.
UPDATE "clients" SET "status" = 'ACTIVE' WHERE "deletedAt" IS NULL;

-- Only now is the old column redundant.
ALTER TABLE "clients" DROP COLUMN "homeAirport";

-- CreateIndex
CREATE INDEX "clients_status_deletedAt_idx" ON "clients"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "clients_nextFollowUpAt_idx" ON "clients"("nextFollowUpAt");

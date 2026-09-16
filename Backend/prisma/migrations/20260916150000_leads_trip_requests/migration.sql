-- CreateEnum
CREATE TYPE "ClientPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FollowUpMethod" AS ENUM ('CALL', 'EMAIL', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "TripRequestStatus" AS ENUM ('OPEN', 'SOURCING', 'QUOTED', 'CONVERTED', 'LOST');

-- AlterEnum
--
-- The funnel gains QUALIFIED, PROPOSAL and WON, and loses NEGOTIATING and
-- BOOKED, to match the Leads screen the desk actually works from.
--
-- Prisma generated a straight `::text::"LeadStage_new"` cast here, which would
-- have failed on the first row holding a value the new enum does not have —
-- and one live row held BOOKED. The USING clause below maps the two retired
-- values onto their successors instead of dropping the rows on the floor:
--
--   NEGOTIATING -> PROPOSAL   (the desk has made an offer, not yet priced)
--   BOOKED      -> WON        (the lead converted)
--
-- Everything else carries its own name across unchanged.
BEGIN;
CREATE TYPE "LeadStage_new" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'QUOTED', 'WON', 'LOST');
ALTER TABLE "public"."clients" ALTER COLUMN "leadStage" DROP DEFAULT;
ALTER TABLE "clients" ALTER COLUMN "leadStage" TYPE "LeadStage_new" USING (
  CASE "leadStage"::text
    WHEN 'NEGOTIATING' THEN 'PROPOSAL'
    WHEN 'BOOKED'      THEN 'WON'
    ELSE "leadStage"::text
  END
)::"LeadStage_new";
ALTER TYPE "LeadStage" RENAME TO "LeadStage_old";
ALTER TYPE "LeadStage_new" RENAME TO "LeadStage";
DROP TYPE "public"."LeadStage_old";
ALTER TABLE "clients" ALTER COLUMN "leadStage" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "followUpMethod" "FollowUpMethod",
ADD COLUMN     "priority" "ClientPriority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "defaultFollowUpMethod" "FollowUpMethod",
ADD COLUMN     "maxActiveLeads" INTEGER;

-- CreateTable
CREATE TABLE "trip_requests" (
    "id" UUID NOT NULL,
    "reference" SERIAL NOT NULL,
    "clientId" UUID NOT NULL,
    "assignedBrokerId" UUID,
    "source" "LeadSource" NOT NULL DEFAULT 'DIRECT',
    "status" "TripRequestStatus" NOT NULL DEFAULT 'OPEN',
    "originAirportId" UUID,
    "destinationAirportId" UUID,
    "departureDate" DATE,
    "returnDate" DATE,
    "passengers" INTEGER,
    "aircraftPreference" "AircraftCategory",
    "estimatedValue" DECIMAL(12,2),
    "summary" TEXT,
    "requirements" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "trip_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_requests_reference_key" ON "trip_requests"("reference");

-- CreateIndex
CREATE INDEX "trip_requests_status_deletedAt_idx" ON "trip_requests"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "trip_requests_clientId_idx" ON "trip_requests"("clientId");

-- CreateIndex
CREATE INDEX "trip_requests_assignedBrokerId_status_idx" ON "trip_requests"("assignedBrokerId", "status");

-- CreateIndex
CREATE INDEX "trip_requests_departureDate_idx" ON "trip_requests"("departureDate");

-- AddForeignKey
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_assignedBrokerId_fkey" FOREIGN KEY ("assignedBrokerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "airports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "airports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


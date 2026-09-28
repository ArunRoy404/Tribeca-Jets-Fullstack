-- Itineraries (#12): the passenger-facing document for a trip.
--
-- One new table, `itineraries`, unique on `tripId` — at most one document per
-- trip. Aircraft, operator, tail number, route and the passenger manifest are
-- deliberately not columns here: they are the trip's own facts, read through
-- the relation on every render, so a rebooked trip can never leave a stale
-- aircraft name behind on its own itinerary.
--
-- Nothing existing changes; no backfill.

-- CreateEnum
CREATE TYPE "ItineraryStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateTable
CREATE TABLE "itineraries" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "status" "ItineraryStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentById" UUID,
    "logoUrl" TEXT,
    "arrivalTime" VARCHAR(5),
    "flightTime" VARCHAR(20),
    "miles" VARCHAR(20),
    "departureFbo" TEXT,
    "arrivalFbo" TEXT,
    "catering" TEXT,
    "groundTransport" TEXT,
    "operatorItineraryUrl" TEXT,
    "operatorItineraryText" TEXT,
    "exteriorImageUrl" TEXT,
    "interiorImageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "itineraries_tripId_key" ON "itineraries"("tripId");

-- CreateIndex
CREATE INDEX "itineraries_status_deletedAt_idx" ON "itineraries"("status", "deletedAt");

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

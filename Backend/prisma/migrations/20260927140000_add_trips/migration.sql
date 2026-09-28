-- Trips (#11): the booked flight, its legs and its named passengers.
-- Also the second pass Client Credits was owed: `appliedToTripId`, the
-- foreign key deliberately left out until trips existed. Nothing backfilled:
-- no trip rows exist yet, and existing credits keep `reason` as written.

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('ONE_WAY', 'ROUND_TRIP', 'MULTI_LEG');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'BOOKED', 'CONFIRMED', 'IN_FLIGHT', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "client_credits" ADD COLUMN     "appliedToTripId" UUID;

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "reference" SERIAL NOT NULL,
    "clientId" UUID NOT NULL,
    "assignedBrokerId" UUID,
    "tripRequestId" UUID,
    "quoteId" UUID,
    "operatorId" UUID,
    "aircraftId" UUID,
    "aircraftDescription" VARCHAR(200),
    "type" "TripType" NOT NULL DEFAULT 'ONE_WAY',
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "operatorConfirmedAt" TIMESTAMP(3),
    "passengerCount" INTEGER,
    "departureDate" DATE,
    "basePrice" DECIMAL(12,2),
    "fetEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fetRate" DECIMAL(6,5) NOT NULL DEFAULT 0.075,
    "operatorCost" DECIMAL(12,2),
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "internalNotes" TEXT,
    "clientNotes" TEXT,
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_legs" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "originAirportId" UUID NOT NULL,
    "destinationAirportId" UUID NOT NULL,
    "departureDate" DATE,
    "departureTime" VARCHAR(5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "trip_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_passengers" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "dateOfBirth" DATE,
    "passportNumber" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "trip_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trips_reference_key" ON "trips"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "trips_quoteId_key" ON "trips"("quoteId");

-- CreateIndex
CREATE INDEX "trips_status_deletedAt_idx" ON "trips"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "trips_assignedBrokerId_status_idx" ON "trips"("assignedBrokerId", "status");

-- CreateIndex
CREATE INDEX "trips_clientId_idx" ON "trips"("clientId");

-- CreateIndex
CREATE INDEX "trips_operatorId_idx" ON "trips"("operatorId");

-- CreateIndex
CREATE INDEX "trips_aircraftId_idx" ON "trips"("aircraftId");

-- CreateIndex
CREATE INDEX "trips_departureDate_idx" ON "trips"("departureDate");

-- CreateIndex
CREATE INDEX "trip_legs_tripId_deletedAt_sequence_idx" ON "trip_legs"("tripId", "deletedAt", "sequence");

-- CreateIndex
CREATE INDEX "trip_passengers_tripId_deletedAt_sequence_idx" ON "trip_passengers"("tripId", "deletedAt", "sequence");

-- CreateIndex
CREATE INDEX "client_credits_appliedToTripId_idx" ON "client_credits"("appliedToTripId");

-- AddForeignKey
ALTER TABLE "client_credits" ADD CONSTRAINT "client_credits_appliedToTripId_fkey" FOREIGN KEY ("appliedToTripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_assignedBrokerId_fkey" FOREIGN KEY ("assignedBrokerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_tripRequestId_fkey" FOREIGN KEY ("tripRequestId") REFERENCES "trip_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_legs" ADD CONSTRAINT "trip_legs_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_passengers" ADD CONSTRAINT "trip_passengers_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_passengers" ADD CONSTRAINT "trip_passengers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_passengers" ADD CONSTRAINT "trip_passengers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_passengers" ADD CONSTRAINT "trip_passengers_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_passengers" ADD CONSTRAINT "trip_passengers_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


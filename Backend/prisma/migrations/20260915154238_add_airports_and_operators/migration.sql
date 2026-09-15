-- Airports and operators: shared reference data that trips, quotes,
-- itineraries and sourcing all depend on.
--
-- Note for whoever reads this next: `migrate diff` also wanted to drop
-- 'INVITATION' from "VerificationPurpose" here. That is unrelated drift left by
-- a revert -- the value exists in the database but no longer in the schema --
-- and removing it is not this migration's business. Deliberately omitted.

-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('ACTIVE', 'PREFERRED', 'INACTIVE');

-- CreateTable
CREATE TABLE "airports" (
    "id" UUID NOT NULL,
    "icao" VARCHAR(4) NOT NULL,
    "iata" VARCHAR(3),
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "longestRunwayFt" INTEGER,
    "assignedFbo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OperatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "homeBase" TEXT,
    "website" TEXT,
    "generalEmail" TEXT,
    "generalPhone" TEXT,
    "primaryContact" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "aircraftTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceRoutes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reliabilityRating" DOUBLE PRECISION,
    "safetyRating" TEXT,
    "responseSpeed" TEXT,
    "cancellationPolicy" TEXT,
    "paymentTerms" TEXT,
    "sourcingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airports_icao_key" ON "airports"("icao");

-- CreateIndex
CREATE INDEX "airports_country_deletedAt_idx" ON "airports"("country", "deletedAt");

-- CreateIndex
CREATE INDEX "airports_iata_idx" ON "airports"("iata");

-- CreateIndex
CREATE INDEX "airports_name_idx" ON "airports"("name");

-- CreateIndex
CREATE INDEX "operators_status_deletedAt_idx" ON "operators"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "operators_name_idx" ON "operators"("name");

-- AddForeignKey
ALTER TABLE "airports" ADD CONSTRAINT "airports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airports" ADD CONSTRAINT "airports_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operators" ADD CONSTRAINT "operators_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operators" ADD CONSTRAINT "operators_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


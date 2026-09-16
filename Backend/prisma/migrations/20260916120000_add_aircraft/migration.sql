-- CreateEnum
CREATE TYPE "AircraftCategory" AS ENUM ('TURBOPROP', 'LIGHT_JET', 'MIDSIZE_JET', 'SUPER_MIDSIZE', 'HEAVY_JET', 'ULTRA_LONG_RANGE', 'VIP_AIRLINER');

-- CreateEnum
CREATE TYPE "AircraftStatus" AS ENUM ('AVAILABLE', 'IN_SERVICE', 'MAINTENANCE', 'INACTIVE');

-- CreateTable
CREATE TABLE "aircraft" (
    "id" UUID NOT NULL,
    "tailNumber" VARCHAR(12) NOT NULL,
    "model" TEXT NOT NULL,
    "manufacturer" TEXT,
    "category" "AircraftCategory" NOT NULL,
    "status" "AircraftStatus" NOT NULL DEFAULT 'AVAILABLE',
    "operatorId" UUID,
    "homeBaseId" UUID,
    "maxPassengers" INTEGER,
    "rangeNm" INTEGER,
    "yearBuilt" INTEGER,
    "maxSpeed" TEXT,
    "cruiseSpeed" TEXT,
    "serviceCeilingFt" INTEGER,
    "baggageCapacityCuFt" INTEGER,
    "cabinLengthFt" DECIMAL(5,1),
    "maxTakeoffWeightLb" INTEGER,
    "emptyWeightLb" INTEGER,
    "fuelCapacityGal" INTEGER,
    "takeoffDistanceFt" INTEGER,
    "landingDistanceFt" INTEGER,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastInspectionAt" DATE,
    "lastAnnualAt" DATE,
    "nextInspectionDueAt" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_tailNumber_key" ON "aircraft"("tailNumber");

-- CreateIndex
CREATE INDEX "aircraft_status_deletedAt_idx" ON "aircraft"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "aircraft_category_deletedAt_idx" ON "aircraft"("category", "deletedAt");

-- CreateIndex
CREATE INDEX "aircraft_operatorId_idx" ON "aircraft"("operatorId");

-- CreateIndex
CREATE INDEX "aircraft_homeBaseId_idx" ON "aircraft"("homeBaseId");

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_homeBaseId_fkey" FOREIGN KEY ("homeBaseId") REFERENCES "airports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


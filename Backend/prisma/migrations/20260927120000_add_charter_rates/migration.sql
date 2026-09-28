-- Client adjustment #6: the desk's own charter rates per aircraft category,
-- which the instant estimate reads. Empty on creation — no rate is invented.

-- CreateTable
CREATE TABLE "charter_rates" (
    "id" UUID NOT NULL,
    "category" "AircraftCategory" NOT NULL,
    "hourlyRate" DECIMAL(12,2),
    "averageSpeedKnots" INTEGER,
    "typicalSeats" INTEGER,
    "minimumHours" DECIMAL(4,1),
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "charter_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "charter_rates_category_key" ON "charter_rates"("category");

-- AddForeignKey
ALTER TABLE "charter_rates" ADD CONSTRAINT "charter_rates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charter_rates" ADD CONSTRAINT "charter_rates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


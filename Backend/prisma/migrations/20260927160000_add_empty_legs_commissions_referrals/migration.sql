-- Phase 1 close-out (27 Sep 2026): the three modules client adjustments #10b
-- and #11 were waiting on, built in dependency order.
--
--   * Empty Legs (#10b's dependency) — `empty_legs`. Matching against trip
--     requests is a query on read, so nothing about it is stored.
--   * Commissions (#11's Commission Center) — `commissions`, on a trip. The
--     estimate is computed from the trip's profit on read; only the basis,
--     rate/amount and the settled final figure are stored.
--   * Referral Agent (#11) — the REFERRAL_AGENT role, a referral agent's
--     standard commission on `users`, `referrals`, `referral_resources`, and
--     the REFERRAL note subject (the agent's "Agent Update" feed).
--
-- Nothing is backfilled: every table is new, and the three `users` columns
-- are null for every existing (non-agent) account.

-- CreateEnum
CREATE TYPE "CommissionRecipientType" AS ENUM ('REFERRAL_AGENT', 'CLIENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "CommissionBasis" AS ENUM ('PERCENT_OF_PROFIT', 'FLAT_FEE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'EARNED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionPaymentMethod" AS ENUM ('WIRE_TRANSFER', 'ACH', 'CHECK', 'ZELLE', 'CREDIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "EmptyLegStatus" AS ENUM ('AVAILABLE', 'MATCHED', 'BOOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('SUBMITTED', 'CONTACTED', 'QUOTING', 'BOOKED', 'COMPLETED', 'LOST', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NoteSubjectType" ADD VALUE 'REFERRAL';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'REFERRAL_AGENT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "commissionAmount" DECIMAL(12,2),
ADD COLUMN     "commissionBasis" "CommissionBasis",
ADD COLUMN     "commissionPercentage" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "reference" SERIAL NOT NULL,
    "tripId" UUID NOT NULL,
    "recipientType" "CommissionRecipientType" NOT NULL,
    "recipientUserId" UUID,
    "recipientClientId" UUID,
    "recipientName" VARCHAR(200),
    "recipientCompany" VARCHAR(200),
    "referralId" UUID,
    "brokerId" UUID,
    "basis" "CommissionBasis" NOT NULL DEFAULT 'FLAT_FEE',
    "percentage" DECIMAL(5,2),
    "amount" DECIMAL(12,2),
    "finalAmount" DECIMAL(12,2),
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "method" "CommissionPaymentMethod",
    "paidAt" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empty_legs" (
    "id" UUID NOT NULL,
    "reference" SERIAL NOT NULL,
    "originAirportId" UUID NOT NULL,
    "destinationAirportId" UUID NOT NULL,
    "departureDate" DATE NOT NULL,
    "departureTime" VARCHAR(5),
    "expiresAt" TIMESTAMP(3),
    "operatorId" UUID,
    "aircraftId" UUID,
    "aircraftDescription" VARCHAR(200),
    "seats" INTEGER,
    "price" DECIMAL(12,2),
    "status" "EmptyLegStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "empty_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "reference" SERIAL NOT NULL,
    "agentId" UUID NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'SUBMITTED',
    "clientFirstName" VARCHAR(100) NOT NULL,
    "clientLastName" VARCHAR(100) NOT NULL,
    "clientEmail" VARCHAR(254),
    "clientPhone" VARCHAR(40),
    "originAirportId" UUID,
    "destinationAirportId" UUID,
    "departureDate" DATE,
    "returnDate" DATE,
    "departureTime" VARCHAR(5),
    "passengers" INTEGER,
    "aircraftPreference" "AircraftCategory",
    "budget" DECIMAL(12,2),
    "notes" TEXT,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedBrokerId" UUID,
    "clientId" UUID,
    "tripRequestId" UUID,
    "tripId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_resources" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "referral_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commissions_reference_key" ON "commissions"("reference");

-- CreateIndex
CREATE INDEX "commissions_status_deletedAt_idx" ON "commissions"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "commissions_tripId_idx" ON "commissions"("tripId");

-- CreateIndex
CREATE INDEX "commissions_recipientUserId_deletedAt_idx" ON "commissions"("recipientUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "commissions_brokerId_idx" ON "commissions"("brokerId");

-- CreateIndex
CREATE INDEX "commissions_referralId_idx" ON "commissions"("referralId");

-- CreateIndex
CREATE UNIQUE INDEX "empty_legs_reference_key" ON "empty_legs"("reference");

-- CreateIndex
CREATE INDEX "empty_legs_status_deletedAt_idx" ON "empty_legs"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "empty_legs_originAirportId_destinationAirportId_idx" ON "empty_legs"("originAirportId", "destinationAirportId");

-- CreateIndex
CREATE INDEX "empty_legs_departureDate_idx" ON "empty_legs"("departureDate");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_reference_key" ON "referrals"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_tripRequestId_key" ON "referrals"("tripRequestId");

-- CreateIndex
CREATE INDEX "referrals_agentId_deletedAt_status_idx" ON "referrals"("agentId", "deletedAt", "status");

-- CreateIndex
CREATE INDEX "referrals_assignedBrokerId_status_idx" ON "referrals"("assignedBrokerId", "status");

-- CreateIndex
CREATE INDEX "referrals_status_deletedAt_idx" ON "referrals"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "referral_resources_deletedAt_createdAt_idx" ON "referral_resources"("deletedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_recipientClientId_fkey" FOREIGN KEY ("recipientClientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_legs" ADD CONSTRAINT "empty_legs_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_legs" ADD CONSTRAINT "empty_legs_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_legs" ADD CONSTRAINT "empty_legs_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_legs" ADD CONSTRAINT "empty_legs_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_legs" ADD CONSTRAINT "empty_legs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_legs" ADD CONSTRAINT "empty_legs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_legs" ADD CONSTRAINT "empty_legs_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_legs" ADD CONSTRAINT "empty_legs_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "airports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "airports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_assignedBrokerId_fkey" FOREIGN KEY ("assignedBrokerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_tripRequestId_fkey" FOREIGN KEY ("tripRequestId") REFERENCES "trip_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_resources" ADD CONSTRAINT "referral_resources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_resources" ADD CONSTRAINT "referral_resources_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_resources" ADD CONSTRAINT "referral_resources_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_resources" ADD CONSTRAINT "referral_resources_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


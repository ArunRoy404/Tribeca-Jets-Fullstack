-- Money a client has on account (client adjustment #9).
--
-- A ledger, not a number. The client asked to "enter how much that is and
-- always edit that number or select if it was used towards another trip" —
-- which is two kinds of movement, so it is rows with a balance summed from
-- them rather than one editable field. A balance dropping from $18,000 to
-- $6,000 with nothing saying which trip consumed it is an argument waiting to
-- happen, and a stored total beside the parts it is computed from is the shape
-- this schema forbids everywhere else.
--
-- There is deliberately no `balance` column and no `appliedToTripId`. The
-- balance is summed on read; the trip foreign key lands the day Trips does,
-- rather than being stubbed with a string that points at nothing.

-- CreateEnum
CREATE TYPE "CreditEntryType" AS ENUM ('CREDIT', 'APPLICATION');

-- CreateTable
CREATE TABLE "client_credits" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "type" "CreditEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredAt" DATE NOT NULL,
    "reason" VARCHAR(500),
    "reference" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "client_credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_credits_clientId_deletedAt_occurredAt_idx" ON "client_credits"("clientId", "deletedAt", "occurredAt");

-- AddForeignKey
ALTER TABLE "client_credits" ADD CONSTRAINT "client_credits_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_credits" ADD CONSTRAINT "client_credits_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_credits" ADD CONSTRAINT "client_credits_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_credits" ADD CONSTRAINT "client_credits_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_credits" ADD CONSTRAINT "client_credits_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


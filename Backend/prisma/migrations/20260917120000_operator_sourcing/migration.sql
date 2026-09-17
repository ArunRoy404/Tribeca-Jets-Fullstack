-- Operator Sourcing (#9)
--
-- One new table. The sourcing board's rows are trip requests being worked —
-- client, broker, route, departure and budget are all TripRequest columns —
-- so the only genuinely new record is what each operator came back with.
-- TripRequest gains the quote deadline its request builder asks for.
--
-- Additive throughout: no column is dropped, no value rewritten, so it is
-- safe on the live database.

-- CreateEnum
CREATE TYPE "OperatorQuoteStatus" AS ENUM ('AWAITING_RESPONSE', 'RECEIVED', 'APPROVED', 'REJECTED', 'DECLINED');

-- AlterTable
ALTER TABLE "trip_requests" ADD COLUMN     "quoteDeadline" DATE;

-- CreateTable
CREATE TABLE "operator_quotes" (
    "id" UUID NOT NULL,
    "tripRequestId" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "suggestedAircraft" TEXT,
    "aircraftId" UUID,
    "quotedAircraft" TEXT,
    "quotedTailNumber" VARCHAR(12),
    "price" DECIMAL(12,2),
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "terms" TEXT,
    "status" "OperatorQuoteStatus" NOT NULL DEFAULT 'AWAITING_RESPONSE',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "operator_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operator_quotes_tripRequestId_status_idx" ON "operator_quotes"("tripRequestId", "status");

-- CreateIndex
CREATE INDEX "operator_quotes_operatorId_status_idx" ON "operator_quotes"("operatorId", "status");

-- CreateIndex
CREATE INDEX "operator_quotes_status_deletedAt_idx" ON "operator_quotes"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "operator_quotes_requestedAt_idx" ON "operator_quotes"("requestedAt");

-- CreateIndex
CREATE INDEX "operator_quotes_tripRequestId_operatorId_idx" ON "operator_quotes"("tripRequestId", "operatorId");

-- CreateIndex
--
-- One LIVE ask per operator per enquiry, hand-written because Prisma cannot
-- express a partial index. The generated form was
--
--     UNIQUE ("tripRequestId", "operatorId", "deletedAt")
--
-- which does not do the job: Postgres treats NULLs as distinct, so two live
-- rows both carrying deletedAt = NULL satisfy it and the duplicate gets in.
-- Restricting the index to live rows is what actually means "one".
--
-- Archived rows are excluded on purpose, so a withdrawn ask can be re-sent.
CREATE UNIQUE INDEX "operator_quotes_one_live_per_operator"
    ON "operator_quotes"("tripRequestId", "operatorId")
    WHERE "deletedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "operator_quotes" ADD CONSTRAINT "operator_quotes_tripRequestId_fkey" FOREIGN KEY ("tripRequestId") REFERENCES "trip_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_quotes" ADD CONSTRAINT "operator_quotes_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_quotes" ADD CONSTRAINT "operator_quotes_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_quotes" ADD CONSTRAINT "operator_quotes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_quotes" ADD CONSTRAINT "operator_quotes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_quotes" ADD CONSTRAINT "operator_quotes_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_quotes" ADD CONSTRAINT "operator_quotes_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


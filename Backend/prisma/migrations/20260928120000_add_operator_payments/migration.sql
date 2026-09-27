-- Operator Payments (#17): what Tribeca owes an operator for a trip, and the
-- money sent against it.
--
--   * `operator_payables` — the operator's bill: amount, due date, their own
--     invoice number, OPEN or CANCELLED. Paid, balance and "overdue" are
--     computed from the payments on read; none is a column.
--   * `operator_payable_payments` — the ledger under it, with the six-column
--     archive trail. Reuses the shared `PaymentMethod` enum.
--
-- Nothing is backfilled and no existing table changes: both tables are new.

-- CreateEnum
CREATE TYPE "OperatorPayableStatus" AS ENUM ('OPEN', 'CANCELLED');

-- CreateTable
CREATE TABLE "operator_payables" (
    "id" UUID NOT NULL,
    "reference" SERIAL NOT NULL,
    "tripId" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "OperatorPayableStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" DATE,
    "operatorReference" VARCHAR(100),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "operator_payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_payable_payments" (
    "id" UUID NOT NULL,
    "payableId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(100),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "operator_payable_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operator_payables_reference_key" ON "operator_payables"("reference");

-- CreateIndex
CREATE INDEX "operator_payables_status_deletedAt_idx" ON "operator_payables"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "operator_payables_tripId_deletedAt_idx" ON "operator_payables"("tripId", "deletedAt");

-- CreateIndex
CREATE INDEX "operator_payables_operatorId_deletedAt_idx" ON "operator_payables"("operatorId", "deletedAt");

-- CreateIndex
CREATE INDEX "operator_payables_dueDate_idx" ON "operator_payables"("dueDate");

-- CreateIndex
CREATE INDEX "operator_payable_payments_payableId_deletedAt_paidAt_idx" ON "operator_payable_payments"("payableId", "deletedAt", "paidAt");

-- AddForeignKey
ALTER TABLE "operator_payables" ADD CONSTRAINT "operator_payables_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payables" ADD CONSTRAINT "operator_payables_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payables" ADD CONSTRAINT "operator_payables_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payables" ADD CONSTRAINT "operator_payables_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payables" ADD CONSTRAINT "operator_payables_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payables" ADD CONSTRAINT "operator_payables_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payable_payments" ADD CONSTRAINT "operator_payable_payments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "operator_payables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payable_payments" ADD CONSTRAINT "operator_payable_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payable_payments" ADD CONSTRAINT "operator_payable_payments_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payable_payments" ADD CONSTRAINT "operator_payable_payments_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payable_payments" ADD CONSTRAINT "operator_payable_payments_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "trips" ADD COLUMN "contractSentAt" TIMESTAMP(3);
ALTER TABLE "trips" ADD COLUMN "contractReceivedAt" TIMESTAMP(3);
ALTER TABLE "trips" ADD COLUMN "operatorPaymentReceivedAt" TIMESTAMP(3);

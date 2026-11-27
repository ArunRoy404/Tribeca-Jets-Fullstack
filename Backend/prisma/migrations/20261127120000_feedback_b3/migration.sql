-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "leadSourceOther" TEXT;

-- AlterTable
ALTER TABLE "commissions" ADD COLUMN     "paymentReference" TEXT;

-- AlterTable
ALTER TABLE "operators" ADD COLUMN     "oaRequired" BOOLEAN;

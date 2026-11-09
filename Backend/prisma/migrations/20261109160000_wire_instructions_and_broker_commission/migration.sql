-- AlterEnum
ALTER TYPE "CommissionRecipientType" ADD VALUE 'BROKER';

-- AlterTable
ALTER TABLE "company_settings"
  ADD COLUMN "wireBankName" VARCHAR(120),
  ADD COLUMN "wireBeneficiaryName" VARCHAR(120),
  ADD COLUMN "wireRoutingNumber" VARCHAR(40),
  ADD COLUMN "wireAccountNumber" VARCHAR(60),
  ADD COLUMN "wireSwiftBic" VARCHAR(40),
  ADD COLUMN "wireInstructions" TEXT;

-- AlterTable
ALTER TABLE "invoices"
  ADD COLUMN "wireInstructions" TEXT;

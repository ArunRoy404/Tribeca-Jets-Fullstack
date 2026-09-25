-- AlterEnum
ALTER TYPE "VerificationPurpose" ADD VALUE 'INVITATION';

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "exteriorImageUrl" TEXT;

-- CreateEnum
CREATE TYPE "TripApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "trips" ADD COLUMN "approvalStatus" "TripApprovalStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "trips" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "trips" ADD COLUMN "approvedById" UUID;
ALTER TABLE "trips" ADD COLUMN "rejectionReason" TEXT;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

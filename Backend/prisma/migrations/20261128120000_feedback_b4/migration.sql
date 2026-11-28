-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "interiorImageUrl" TEXT;

-- AlterTable
ALTER TABLE "trip_requests" ADD COLUMN     "luggageCount" INTEGER,
ADD COLUMN     "luggageWeightLb" INTEGER;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "luggageCount" INTEGER,
ADD COLUMN     "luggageWeightLb" INTEGER;

-- AlterTable
ALTER TABLE "trip_passengers" ADD COLUMN     "weightLb" INTEGER;

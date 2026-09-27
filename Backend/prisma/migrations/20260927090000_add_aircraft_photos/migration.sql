-- Client adjustment #3 (fleet half): an exterior and an interior photograph
-- per aircraft, stored as relative /api/uploads/<id> URLs. Nullable, no
-- backfill: no aircraft has a photo until someone uploads one.

-- AlterTable
ALTER TABLE "aircraft" ADD COLUMN     "exteriorImageUrl" TEXT,
ADD COLUMN     "interiorImageUrl" TEXT;

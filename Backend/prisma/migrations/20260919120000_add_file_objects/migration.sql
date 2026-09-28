-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('USER_DOCUMENT', 'RESOURCE', 'AIRCRAFT_PHOTO');

-- CreateTable
CREATE TABLE "file_objects" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "driver" VARCHAR(16) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(128) NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "category" "FileCategory" NOT NULL,
    "label" VARCHAR(200),
    "notes" TEXT,
    "ownerUserId" UUID,
    "aircraftId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_objects_storageKey_key" ON "file_objects"("storageKey");

-- CreateIndex
CREATE INDEX "file_objects_category_deletedAt_createdAt_idx" ON "file_objects"("category", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "file_objects_ownerUserId_deletedAt_idx" ON "file_objects"("ownerUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "file_objects_aircraftId_deletedAt_idx" ON "file_objects"("aircraftId", "deletedAt");

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


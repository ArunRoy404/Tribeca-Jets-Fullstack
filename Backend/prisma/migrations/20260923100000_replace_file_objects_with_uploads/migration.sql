-- Replaces the `file_objects` table with `uploads`.
--
-- `file_objects` keyed every file to a `FileCategory`, and the category decided
-- who could read it. That made a category a prerequisite of an upload, which in
-- turn made it impossible to attach a photograph to a record that did not exist
-- yet — the ordinary shape of a create form. It also meant every new upload
-- spot in the product needed a new enum value and a migration.
--
-- `uploads` knows nothing about why a file was uploaded. A screen uploads,
-- receives a URL, and stores that URL on whatever record it was editing.
--
-- The table is dropped rather than migrated: it held no production rows, only
-- Postman fixtures and verification probes, and nothing in the frontend ever
-- consumed the API that wrote it. The objects those rows referenced are removed
-- from storage separately; SQL cannot reach them.

-- CreateEnum
CREATE TYPE "UploadKind" AS ENUM ('IMAGE', 'DOCUMENT');

-- DropForeignKey
ALTER TABLE "file_objects" DROP CONSTRAINT "file_objects_aircraftId_fkey";

-- DropForeignKey
ALTER TABLE "file_objects" DROP CONSTRAINT "file_objects_createdById_fkey";

-- DropForeignKey
ALTER TABLE "file_objects" DROP CONSTRAINT "file_objects_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "file_objects" DROP CONSTRAINT "file_objects_ownerUserId_fkey";

-- DropForeignKey
ALTER TABLE "file_objects" DROP CONSTRAINT "file_objects_restoredById_fkey";

-- DropForeignKey
ALTER TABLE "file_objects" DROP CONSTRAINT "file_objects_updatedById_fkey";

-- DropTable
DROP TABLE "file_objects";

-- DropEnum
DROP TYPE "FileCategory";

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL,
    "storageKey" VARCHAR(512) NOT NULL,
    "driver" VARCHAR(16) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(128) NOT NULL,
    "kind" "UploadKind" NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uploads_checksum_uploadedById_deletedAt_idx" ON "uploads"("checksum", "uploadedById", "deletedAt");

-- CreateIndex
CREATE INDEX "uploads_deletedAt_createdAt_idx" ON "uploads"("deletedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Document Vault (#22): one table of documents, each owned by exactly one
-- client, trip or operator and pointing at an upload by foreign key.
--
-- Read before shipping — this migration moves data and drops a column:
--   * `trips.documentUrls` was the trip's attachment list before the vault
--     existed. Every URL that still names an upload is copied into
--     `documents` as an OTHER document on its trip, titled with the file's
--     name, before the column is dropped. A URL naming no upload row pointed
--     at nothing already and is not carried.
--   * Nothing else changes, and no file in storage is touched.

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PASSPORT', 'ID', 'CHARTER_AGREEMENT', 'WIRE_CONFIRMATION', 'INVOICE', 'ITINERARY', 'INSURANCE_CERTIFICATE', 'OPERATOR_CERTIFICATE', 'CATERING_REQUEST', 'OTHER');

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "uploadId" UUID NOT NULL,
    "clientId" UUID,
    "tripId" UUID,
    "operatorId" UUID,
    "expiresOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
    -- Exactly one owner: the client folder, the trip folder or the operator's.
    CONSTRAINT "documents_exactly_one_owner" CHECK (num_nonnulls("clientId", "tripId", "operatorId") = 1)
);

-- CreateIndex
CREATE INDEX "documents_clientId_deletedAt_idx" ON "documents"("clientId", "deletedAt");

-- CreateIndex
CREATE INDEX "documents_tripId_deletedAt_idx" ON "documents"("tripId", "deletedAt");

-- CreateIndex
CREATE INDEX "documents_operatorId_deletedAt_idx" ON "documents"("operatorId", "deletedAt");

-- CreateIndex
CREATE INDEX "documents_category_deletedAt_idx" ON "documents"("category", "deletedAt");

-- CreateIndex
CREATE INDEX "documents_expiresOn_deletedAt_idx" ON "documents"("expiresOn", "deletedAt");

-- CreateIndex
CREATE INDEX "documents_deletedAt_createdAt_idx" ON "documents"("deletedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: each trip's attachment URLs become documents on that trip.
-- `/api/uploads/<uuid>` → the upload row; the title is its file name, the
-- author whoever created the trip. Order is kept by the array position.
INSERT INTO "documents" ("id", "title", "category", "uploadId", "tripId", "createdAt", "createdById", "updatedAt", "updatedById")
SELECT
    gen_random_uuid(),
    LEFT(u."filename", 200),
    'OTHER',
    u."id",
    t."id",
    t."createdAt",
    t."createdById",
    CURRENT_TIMESTAMP,
    t."createdById"
FROM "trips" t
CROSS JOIN LATERAL unnest(t."documentUrls") WITH ORDINALITY AS d(url, position)
JOIN "uploads" u ON u."id"::text = regexp_replace(d.url, '^.*/', '')
WHERE d.url ~ '^/api/uploads/[0-9a-fA-F-]{36}$';

-- The vault holds them now; a second list on the trip would drift from it.
ALTER TABLE "trips" DROP COLUMN "documentUrls";

-- The notes timeline (client adjustment #5).
--
-- `Client.notes` is one string, so editing it destroys what it said before.
-- That is a field, not a timeline. It stays as the standing summary the detail
-- sidebar shows; this table is the append-only record of what happened, read
-- alongside the `audit_logs` rows the system already writes.
--
-- Polymorphic, so Trips need this table rather than a second one: `subjectType`
-- plus `subjectId`, with no foreign key the database could enforce. The
-- existence and visibility check lives in the service, which asks the module
-- that owns the subject — see `notes.subjects.ts`.
--
-- `visibility` defaults to INTERNAL for the same reason upload visibility
-- defaults to PRIVATE: failing closed costs a minute, failing open puts desk
-- commentary in front of the person who referred the client. It is #11's
-- "Agent Update" field, built now rather than as a second note system later.

-- CreateEnum
CREATE TYPE "NoteSubjectType" AS ENUM ('CLIENT');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('INTERNAL', 'SHARED');

-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "subjectType" "NoteSubjectType" NOT NULL,
    "subjectId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notes_subjectType_subjectId_deletedAt_createdAt_idx" ON "notes"("subjectType", "subjectId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "notes_createdById_createdAt_idx" ON "notes"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


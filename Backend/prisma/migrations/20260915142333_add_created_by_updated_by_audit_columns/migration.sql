-- Every model carries createdAt / createdById / updatedAt / updatedById.
--
-- On `users` this supersedes invitedBy/invitedAt: inviting is how a staff
-- account comes into existence, so those were the same two facts under a
-- second name. The existing values are COPIED ACROSS before the old columns
-- are dropped — a generated migration would have dropped them outright and
-- silently lost who invited whom.

-- AlterTable: clients
ALTER TABLE "clients" ADD COLUMN "createdById" UUID,
                      ADD COLUMN "updatedById" UUID;

-- AlterTable: users
ALTER TABLE "users" ADD COLUMN "createdById" UUID,
                    ADD COLUMN "updatedById" UUID;

-- Carry the invitation trail forward before dropping its columns.
UPDATE "users" SET "createdById" = "invitedById" WHERE "invitedById" IS NOT NULL;

-- Backfill clients from the broker who originated the relationship. It is the
-- closest thing to a creator that exists on rows predating this column, and
-- leaving them all NULL would make every historical record look orphaned.
UPDATE "clients" SET "createdById" = "originatingBrokerId" WHERE "originatingBrokerId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_invitedById_fkey";

-- DropColumn
ALTER TABLE "users" DROP COLUMN "invitedAt",
                    DROP COLUMN "invitedById";

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

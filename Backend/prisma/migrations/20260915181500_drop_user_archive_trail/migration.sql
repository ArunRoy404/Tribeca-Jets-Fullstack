-- Users are no longer archivable: removal was withdrawn from the module in
-- favour of suspension, so the three columns that existed only to render the
-- Archived tab ("who removed this, who brought it back") go with it.
--
-- `deletedAt` deliberately stays. Auth refuses a stamped row a session, which
-- makes it a database-level kill switch, and it is what keeps the rows archived
-- before the withdrawal out of every list.
--
-- NOTE: `prisma migrate diff` also emits an AlterEnum dropping 'INVITATION'
-- from "VerificationPurpose" here. That is pre-existing drift, not part of this
-- change -- the value is still live in the database while the schema no longer
-- declares it -- so it is stripped by hand, as in the two migrations before
-- this one. It needs resolving on its own terms.

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_restoredById_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "deletedById",
DROP COLUMN "restoredAt",
DROP COLUMN "restoredById";

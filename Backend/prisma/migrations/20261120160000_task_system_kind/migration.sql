BEGIN;

CREATE TYPE "TaskSystemKind" AS ENUM ('TRIP_APPROVAL', 'TRIP_ASSIGNED', 'TRIP_DECLINED');

ALTER TABLE "tasks" ADD COLUMN "systemKind" "TaskSystemKind";

-- This one-time backfill uses the old generated titles on trip-linked rows.
-- The developer accepted the overlap with a manually written task of the same title.
UPDATE "tasks"
SET "systemKind" = CASE
    WHEN "title" LIKE 'Approve Trip TJ-%' THEN 'TRIP_APPROVAL'::"TaskSystemKind"
    WHEN "title" LIKE 'Review Assigned Trip TJ-%' THEN 'TRIP_ASSIGNED'::"TaskSystemKind"
    WHEN "title" LIKE 'Trip TJ-% Approval Declined' THEN 'TRIP_DECLINED'::"TaskSystemKind"
END
WHERE "tripId" IS NOT NULL
  AND ("title" LIKE 'Approve Trip TJ-%'
    OR "title" LIKE 'Review Assigned Trip TJ-%'
    OR "title" LIKE 'Trip TJ-% Approval Declined');

COMMIT;

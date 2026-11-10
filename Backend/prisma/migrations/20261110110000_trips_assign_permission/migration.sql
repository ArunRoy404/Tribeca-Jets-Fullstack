-- Trips · Reassign trips (10 Nov 2026). Reassigning a trip was checked as
-- "an administrator, or TRIPS · ASSIGN" — but ASSIGN was never a Trips
-- action, so it was a role check. It is now in the catalogue: a default for
-- Admin, locked for brokers and assistants. Data only.
--
-- Same rule as 20261110100000_trips_approve_permission: every Admin who
-- could reassign yesterday (stored set holds TRIPS · EDIT, which the route
-- also needed) gets TRIPS · ASSIGN, so adding the action takes nothing away.
UPDATE "users"
SET "permissions" = jsonb_set("permissions", '{TRIPS}', ("permissions"->'TRIPS') || '["ASSIGN"]'::jsonb)
WHERE "role" = 'ADMIN'
  AND "permissions" IS NOT NULL
  AND jsonb_typeof("permissions"->'TRIPS') = 'array'
  AND ("permissions"->'TRIPS') ? 'EDIT'
  AND NOT (("permissions"->'TRIPS') ? 'ASSIGN');

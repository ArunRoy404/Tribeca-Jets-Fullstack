-- Trips · Approve trips (10 Nov 2026). Approving a broker's trip moved from
-- "an administrator with Trips · Edit" to its own action, so the owner can
-- grant it per person. Data only — no schema change.
--
-- Changing a role's defaults never touches existing people, but a new action
-- that takes over an existing power must not take it away either: every
-- Admin who could approve yesterday (stored set holds TRIPS · EDIT) gets
-- TRIPS · APPROVE. A null set already reads as the role's defaults, which
-- include it; Super Admin holds everything and stores nothing.
UPDATE "users"
SET "permissions" = jsonb_set("permissions", '{TRIPS}', ("permissions"->'TRIPS') || '["APPROVE"]'::jsonb)
WHERE "role" = 'ADMIN'
  AND "permissions" IS NOT NULL
  AND jsonb_typeof("permissions"->'TRIPS') = 'array'
  AND ("permissions"->'TRIPS') ? 'EDIT'
  AND NOT (("permissions"->'TRIPS') ? 'APPROVE');

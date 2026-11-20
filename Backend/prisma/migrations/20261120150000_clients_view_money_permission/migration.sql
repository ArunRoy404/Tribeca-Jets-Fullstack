-- Clients · See money on account. Preserve access for every eligible stored
-- set that held Clients · View. Null sets continue to read the role defaults.
UPDATE "users"
SET "permissions" = jsonb_set("permissions", '{CLIENTS}', ("permissions"->'CLIENTS') || '["VIEW_MONEY"]'::jsonb)
WHERE "role" NOT IN ('ASSISTANT', 'REFERRAL_AGENT')
  AND "permissions" IS NOT NULL
  AND jsonb_typeof("permissions"->'CLIENTS') = 'array'
  AND ("permissions"->'CLIENTS') ? 'VIEW'
  AND NOT (("permissions"->'CLIENTS') ? 'VIEW_MONEY');

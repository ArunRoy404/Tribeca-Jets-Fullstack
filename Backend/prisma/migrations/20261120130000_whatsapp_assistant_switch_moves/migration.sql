BEGIN;

LOCK TABLE "company_settings" IN ACCESS EXCLUSIVE MODE;

ALTER TABLE "whatsapp_settings"
  ADD COLUMN "assistantEnabled" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "whatsapp_settings" ("id", "assistantEnabled", "updatedAt")
SELECT "id", "whatsappAssistantEnabled", CURRENT_TIMESTAMP
FROM "company_settings"
WHERE "id" = 1
ON CONFLICT ("id") DO UPDATE
SET "assistantEnabled" = EXCLUDED."assistantEnabled";

ALTER TABLE "company_settings"
  DROP COLUMN "whatsappAssistantEnabled";

COMMIT;

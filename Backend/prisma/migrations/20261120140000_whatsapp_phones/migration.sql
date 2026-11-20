BEGIN;

CREATE TABLE "whatsapp_phones" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "whatsapp_phones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_phones_phone_key" ON "whatsapp_phones"("phone") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "whatsapp_phones_userId_phone_key" ON "whatsapp_phones"("userId", "phone");
CREATE INDEX "whatsapp_phones_userId_deletedAt_idx" ON "whatsapp_phones"("userId", "deletedAt");

ALTER TABLE "whatsapp_phones" ADD CONSTRAINT "whatsapp_phones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_phones" ADD CONSTRAINT "whatsapp_phones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_phones" ADD CONSTRAINT "whatsapp_phones_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_phones" ADD CONSTRAINT "whatsapp_phones_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_phones" ADD CONSTRAINT "whatsapp_phones_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "whatsapp_phones" ("id", "userId", "phone", "label", "verifiedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "whatsappPhone", 'Phone 1', "whatsappPhoneVerifiedAt", "whatsappPhoneVerifiedAt", "whatsappPhoneVerifiedAt"
FROM "users"
WHERE "whatsappPhone" IS NOT NULL AND "whatsappPhoneVerifiedAt" IS NOT NULL;

DROP INDEX "users_whatsappPhone_key";
ALTER TABLE "users" DROP COLUMN "whatsappPhone", DROP COLUMN "whatsappPhoneVerifiedAt";

COMMIT;

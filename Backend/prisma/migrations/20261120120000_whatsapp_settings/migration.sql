ALTER TYPE "VerificationPurpose" ADD VALUE 'WHATSAPP_LINK';

ALTER TABLE "verification_codes" ADD COLUMN "target" VARCHAR(32);

ALTER TABLE "users"
  ADD COLUMN "whatsappPhone" TEXT,
  ADD COLUMN "whatsappPhoneVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_whatsappPhone_key" ON "users"("whatsappPhone");

CREATE TABLE "whatsapp_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "openaiApiKey" TEXT,
    "openaiModel" TEXT,
    "accessToken" TEXT,
    "appSecret" TEXT,
    "verifyToken" TEXT,
    "phoneNumberId" TEXT,
    "graphVersion" TEXT NOT NULL DEFAULT 'v25.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "whatsapp_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "whatsapp_settings_singleton" CHECK ("id" = 1),
    CONSTRAINT "whatsapp_settings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "whatsapp_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

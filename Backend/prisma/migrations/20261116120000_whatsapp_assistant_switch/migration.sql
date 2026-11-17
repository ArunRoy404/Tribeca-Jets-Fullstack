-- The Super Admin's WhatsApp assistant switch (16 Nov 2026). Off by default:
-- the bot answers only once the env is configured and this is switched on.
ALTER TABLE "company_settings" ADD COLUMN "whatsappAssistantEnabled" BOOLEAN NOT NULL DEFAULT false;

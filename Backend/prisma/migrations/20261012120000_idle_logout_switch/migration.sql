-- Settings › Security & Session: switch automatic logout after inactivity on
-- or off for the whole company (owner's decision, 12 Oct 2026). On by
-- default, so the existing row keeps the behaviour it had.
ALTER TABLE "company_settings" ADD COLUMN "idleLogoutEnabled" BOOLEAN NOT NULL DEFAULT true;

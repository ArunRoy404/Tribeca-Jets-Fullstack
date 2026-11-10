-- Settings › Company & Branding: an optional logo for dark backgrounds
-- (10 Nov 2026). An upload URL, like logoUrl; null draws logoUrl there.
ALTER TABLE "company_settings" ADD COLUMN "logoOnDarkUrl" VARCHAR(80);

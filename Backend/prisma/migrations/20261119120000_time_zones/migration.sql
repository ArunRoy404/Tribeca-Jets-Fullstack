-- Time zones for the company and its users. An unset user preference
-- follows the company's time zone.
ALTER TABLE "users" ADD COLUMN "timeZone" VARCHAR(64);
ALTER TABLE "company_settings" ADD COLUMN "companyTimeZone" VARCHAR(64) NOT NULL DEFAULT 'America/New_York';

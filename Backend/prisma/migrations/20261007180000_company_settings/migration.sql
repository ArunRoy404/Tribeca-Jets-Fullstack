-- The company's settings: one row, for the whole company (7 Oct 2026).
-- See prisma/schema/settings.prisma.

-- CreateTable
CREATE TABLE "company_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyName" VARCHAR(120) NOT NULL DEFAULT 'Tribeca Jets',
    "companyEmail" VARCHAR(254),
    "website" VARCHAR(200),
    "phone" VARCHAR(40),
    "address" VARCHAR(300),
    "clientServicesLabel" VARCHAR(120),
    "logoUrl" VARCHAR(80),
    "showContactBlock" BOOLEAN NOT NULL DEFAULT true,
    "logoOnDocuments" BOOLEAN NOT NULL DEFAULT true,
    "showBrokerContact" BOOLEAN NOT NULL DEFAULT true,
    "defaultMarkupPercent" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "quoteValidityHours" INTEGER NOT NULL DEFAULT 24,
    "defaultFetPercent" DECIMAL(6,3) NOT NULL DEFAULT 7.5,
    "applyFetByDefault" BOOLEAN NOT NULL DEFAULT true,
    "followUpIntervalDays" INTEGER NOT NULL DEFAULT 3,
    "defaultLeadStage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "defaultQuoteTerms" TEXT,
    "idleTimeoutMinutes" INTEGER NOT NULL DEFAULT 10,
    "idleWarningMinutes" INTEGER NOT NULL DEFAULT 1,
    "showIdleWarning" BOOLEAN NOT NULL DEFAULT true,
    "requireAdminTwoFactor" BOOLEAN NOT NULL DEFAULT false,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
    "flightAlertsToBrokers" BOOLEAN NOT NULL DEFAULT true,
    "followUpReminders" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminders" BOOLEAN NOT NULL DEFAULT true,
    "quoteExpiryReminders" BOOLEAN NOT NULL DEFAULT true,
    "quoteExpiryWarningHours" INTEGER NOT NULL DEFAULT 4,
    "paymentReminderDays" INTEGER NOT NULL DEFAULT 1,
    "followUpReminderMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Exactly one row, ever: "the settings" can never become two that disagree.
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_singleton" CHECK ("id" = 1);

-- The row itself, at the defaults above. Nothing else inserts it, so every
-- environment — a fresh database included — starts with settings to read.
INSERT INTO "company_settings" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

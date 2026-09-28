-- Email Templates (#21): the template library and the record of every email
-- sent from it. Two new tables; nothing existing changes and there is no
-- backfill. Read before shipping: no DROP, no rename.

-- CreateEnum
CREATE TYPE "EmailTemplateCategory" AS ENUM ('QUOTE_FOLLOW_UP', 'TRIP_CONFIRMATION', 'CLIENT_UPDATE', 'EMPTY_LEG', 'PAYMENT', 'TRAVEL_AGENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "EmailMessageStatus" AS ENUM ('SENT', 'LOGGED', 'FAILED');

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" "EmailTemplateCategory" NOT NULL DEFAULT 'GENERAL',
    "subject" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "restoredAt" TIMESTAMP(3),
    "restoredById" UUID,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" UUID NOT NULL,
    "toEmail" VARCHAR(320) NOT NULL,
    "toName" VARCHAR(200) NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailMessageStatus" NOT NULL,
    "error" TEXT,
    "templateId" UUID,
    "clientId" UUID,
    "operatorId" UUID,
    "tripId" UUID,
    "quoteId" UUID,
    "invoiceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_templates_category_deletedAt_idx" ON "email_templates"("category", "deletedAt");

-- CreateIndex
CREATE INDEX "email_templates_active_deletedAt_idx" ON "email_templates"("active", "deletedAt");

-- CreateIndex
CREATE INDEX "email_messages_createdAt_idx" ON "email_messages"("createdAt");

-- CreateIndex
CREATE INDEX "email_messages_createdById_idx" ON "email_messages"("createdById");

-- CreateIndex
CREATE INDEX "email_messages_clientId_idx" ON "email_messages"("clientId");

-- CreateIndex
CREATE INDEX "email_messages_operatorId_idx" ON "email_messages"("operatorId");

-- CreateIndex
CREATE INDEX "email_messages_tripId_idx" ON "email_messages"("tripId");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


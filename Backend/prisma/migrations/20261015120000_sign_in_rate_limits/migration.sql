-- Settings › Rate Limiting (owner's decision, 15 Oct 2026): only failed
-- sign-ins and emailed codes are limited, and the company sets the limits.
-- A null limit is the screen's "Never". The defaults are the limits the
-- routes carried before, so the existing row keeps the protection it had —
-- minus the counting of successful sign-ins, which is what was wrong.

-- CreateEnum
CREATE TYPE "FailedSignInScope" AS ENUM ('ACCOUNT_AND_IP', 'ACCOUNT', 'IP');

-- AlterTable
ALTER TABLE "company_settings"
  ADD COLUMN "failedSignInLimit" INTEGER DEFAULT 5,
  ADD COLUMN "failedSignInWindowMinutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "signInLockoutMinutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "failedSignInScope" "FailedSignInScope" NOT NULL DEFAULT 'ACCOUNT_AND_IP',
  ADD COLUMN "codeSendLimit" INTEGER DEFAULT 3,
  ADD COLUMN "codeSendWindowMinutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "codeAttemptLimit" INTEGER DEFAULT 5;

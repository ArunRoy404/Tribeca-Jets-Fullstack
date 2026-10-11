-- Emails are sent by a background queue (6 Oct 2026). A composed email is
-- recorded as QUEUED the moment it is accepted, and the worker moves it to
-- SENT, LOGGED or FAILED. Additive: existing rows keep their status.

-- AlterEnum
ALTER TYPE "EmailMessageStatus" ADD VALUE 'QUEUED' BEFORE 'SENT';

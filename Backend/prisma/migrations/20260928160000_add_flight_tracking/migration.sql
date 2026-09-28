-- Flight Tracking (#14): a manual flight status on each trip leg, and a note
-- subject for a flight's timeline. Additive only — no row is rewritten.

-- CreateEnum
CREATE TYPE "FlightStatus" AS ENUM ('NOT_DEPARTED', 'DELAYED', 'IN_FLIGHT', 'LANDED', 'DIVERTED');

-- AlterEnum
ALTER TYPE "NoteSubjectType" ADD VALUE 'FLIGHT';

-- AlterTable
ALTER TABLE "trip_legs"
  ADD COLUMN "flightStatus" "FlightStatus",
  ADD COLUMN "flightStatusAt" TIMESTAMP(3),
  ADD COLUMN "estimatedArrival" VARCHAR(5),
  ADD COLUMN "trackingUrl" VARCHAR(500);

-- CreateIndex
CREATE INDEX "trip_legs_flightStatus_deletedAt_idx" ON "trip_legs"("flightStatus", "deletedAt");

-- Client adjustment #5's trip timeline: the one enum value the polymorphic
-- notes design promised when Trips (#11) shipped.

-- AlterEnum
ALTER TYPE "NoteSubjectType" ADD VALUE 'TRIP';

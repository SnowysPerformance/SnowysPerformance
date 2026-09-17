-- Coach-only notes about an athlete: injury history, needs analysis,
-- archetype, and general notes. Never shown to the athlete themselves.
ALTER TABLE "User" ADD COLUMN "injuryHistory" TEXT;
ALTER TABLE "User" ADD COLUMN "needsAnalysis" TEXT;
ALTER TABLE "User" ADD COLUMN "archetype" TEXT;
ALTER TABLE "User" ADD COLUMN "generalNotes" TEXT;

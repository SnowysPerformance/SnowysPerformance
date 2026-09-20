-- One row per athlete + exercise, kept in sync automatically whenever a
-- weighted set is logged or deleted, so "current all-time best" is a fast
-- lookup instead of re-scanning every workout log ever entered.
CREATE TABLE "PersonalRecord" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "exerciseName" TEXT NOT NULL,
  "bestWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bestWeightDate" TIMESTAMP(3),
  "bestWeightLogId" TEXT,
  "bestE1rm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bestE1rmDate" TIMESTAMP(3),
  "bestE1rmLogId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonalRecord_athleteId_exerciseName_key" ON "PersonalRecord"("athleteId", "exerciseName");

ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

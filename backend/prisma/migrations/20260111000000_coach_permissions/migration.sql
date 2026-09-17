-- Multi-team coach invites + co-coach permissions:
--   * A coach invite can now hand someone their own brand-new team (a
--     fresh slate, no athletes) instead of joining the inviter's team.
--   * A same-team co-coach invite can be FULL access (edit everyone) or
--     RESTRICTED to a specific list of athletes, chosen up front.
--   * CoachAthleteAccess is the ongoing record of which athletes a
--     RESTRICTED coach may edit — every coach can still see every
--     athlete's plans/progress regardless.
CREATE TYPE "CoachAccessLevel" AS ENUM ('FULL', 'RESTRICTED');

ALTER TABLE "User" ADD COLUMN "accessLevel" "CoachAccessLevel" NOT NULL DEFAULT 'FULL';

ALTER TABLE "Invite" ADD COLUMN "newTeam" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invite" ADD COLUMN "accessLevel" "CoachAccessLevel" NOT NULL DEFAULT 'FULL';
ALTER TABLE "Invite" ADD COLUMN "athleteAccessIds" JSONB;

CREATE TABLE "CoachAthleteAccess" (
  "id" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoachAthleteAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachAthleteAccess_coachId_athleteId_key" ON "CoachAthleteAccess"("coachId", "athleteId");

ALTER TABLE "CoachAthleteAccess" ADD CONSTRAINT "CoachAthleteAccess_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachAthleteAccess" ADD CONSTRAINT "CoachAthleteAccess_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

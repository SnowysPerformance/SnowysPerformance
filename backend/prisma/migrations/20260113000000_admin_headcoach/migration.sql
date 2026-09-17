-- Platform admin (Mark only, set via the ADMIN_EMAIL deploy setting),
-- head coach (owns a team; only they can invite/manage assistant coaches),
-- and per-account suspension (checked on every request, not just login).
ALTER TABLE "User" ADD COLUMN "isHeadCoach" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "suspended" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: every existing team already has coaches, but none of them are
-- flagged as the head coach yet. Treat each team's earliest-created coach
-- account as its head coach — that's whoever originally set the team up,
-- back before invites existed.
UPDATE "User" u
SET "isHeadCoach" = true
WHERE u.role = 'COACH'
  AND u."createdAt" = (
    SELECT MIN(u2."createdAt") FROM "User" u2
    WHERE u2."teamId" = u."teamId" AND u2.role = 'COACH'
  );

-- A head-coach invite (sent by the admin) isn't tied to any existing team —
-- accepting it creates a brand new one — so teamId has to be optional now.
ALTER TABLE "Invite" DROP CONSTRAINT "Invite_teamId_fkey";
ALTER TABLE "Invite" ALTER COLUMN "teamId" DROP NOT NULL;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

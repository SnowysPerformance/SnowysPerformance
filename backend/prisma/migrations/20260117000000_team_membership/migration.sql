-- Multi-team coaches: a coach can now belong to more than one team (e.g.
-- an assistant coach on one team who also runs a separate team of their
-- own). TeamMembership is the join table recording every team a coach
-- belongs to, with their role on that specific team. The existing
-- User.teamId/isHeadCoach/accessLevel columns keep meaning "my currently
-- active team" for every other query in the app — switching teams just
-- copies the chosen membership row's values onto those columns (see
-- switchTeam in auth.controller.ts).
CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "isHeadCoach" BOOLEAN NOT NULL DEFAULT false,
    "accessLevel" "CoachAccessLevel" NOT NULL DEFAULT 'FULL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamMembership_userId_teamId_key" ON "TeamMembership"("userId", "teamId");

ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invites now cover coaches too, not just athletes — an existing coach can
-- bring on another coach the same way they invite an athlete: a one-time
-- link, no more open "create a team" sign-up for anyone off the street.
ALTER TABLE "Invite" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'ATHLETE';

import { Request } from "express";
import { prisma } from "../db";

// Every coach on a team can already SEE every athlete's plans, progress,
// and notes — this only gates WRITES (log/test entries, profile edits,
// deletes, plan assignment) for a coach whose accessLevel is RESTRICTED.
// A FULL-access coach always passes. Looked up fresh from the database
// every time (not trusted from the JWT), so a permission change by the
// team owner takes effect immediately, not just after the coach's next
// login.
export async function checkCanEditAthlete(
  req: Request,
  athleteId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (req.user!.role !== "COACH") return { ok: false, status: 403, error: "Forbidden" };

  const coach = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { accessLevel: true, teamId: true } });
  if (!coach || coach.teamId !== req.user!.teamId) return { ok: false, status: 403, error: "Forbidden" };
  if (coach.accessLevel !== "RESTRICTED") return { ok: true };

  const grant = await prisma.coachAthleteAccess.findUnique({
    where: { coachId_athleteId: { coachId: req.user!.userId, athleteId } },
  });
  if (!grant) {
    return { ok: false, status: 403, error: "You don't have edit permission for this athlete. Ask the team owner to grant it in Settings." };
  }
  return { ok: true };
}

// After a RESTRICTED coach creates or is credited with a new athlete
// (added directly, or via an invite they sent), give them edit access to
// that athlete automatically — otherwise they'd have just brought on
// someone they can't do anything with.
export async function autoGrantIfRestricted(coachId: string, athleteId: string) {
  const coach = await prisma.user.findUnique({ where: { id: coachId }, select: { accessLevel: true } });
  if (coach?.accessLevel === "RESTRICTED") {
    await prisma.coachAthleteAccess.upsert({
      where: { coachId_athleteId: { coachId, athleteId } },
      update: {},
      create: { coachId, athleteId },
    });
  }
}

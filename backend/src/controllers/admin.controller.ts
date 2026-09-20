import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db";

const INVITE_TTL_DAYS = 14;

// Every handler below is for the single platform admin (Mark) only —
// checked fresh from the database on every call, never trusted from the
// JWT, so it can never be spoofed by editing a token.
async function ensureAdmin(req: Request, res: Response): Promise<boolean> {
  if (req.user!.role !== "COACH") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  const me = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { isPlatformAdmin: true } });
  if (!me?.isPlatformAdmin) {
    res.status(403).json({ error: "Admin access only" });
    return false;
  }
  return true;
}

// Every team on the platform, with its head coach, so the admin can see
// who owns what and suspend/remove them.
export async function listTeams(req: Request, res: Response) {
  if (!(await ensureAdmin(req, res))) return;

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, isHeadCoach: true, suspended: true } },
    },
  });
  res.json(
    teams.map((t) => {
      const coaches = t.users.filter((u) => u.role === "COACH");
      const headCoach = coaches.find((u) => u.isHeadCoach) || null;
      return {
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        headCoach,
        // Every coach on this team, head coach included — so an account
        // created back before invites were mandatory (self-registered, or
        // added directly by a head coach) still shows up here. Only the
        // head coach can be suspended/removed from this page; the rest are
        // listed for visibility only.
        coaches,
        coachCount: coaches.length,
        athleteCount: t.users.filter((u) => u.role === "ATHLETE").length,
      };
    })
  );
}

// Pending/used head-coach invites the admin has sent.
export async function listHeadCoachInvites(req: Request, res: Response) {
  if (!(await ensureAdmin(req, res))) return;
  const invites = await prisma.invite.findMany({
    where: { role: "COACH", newTeam: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(invites);
}

// Send a one-time link that lets someone create a brand-new, separate
// team as its head coach. This is now the ONLY way a new team gets
// created — a regular coach can no longer send this kind of invite.
export async function inviteHeadCoach(req: Request, res: Response) {
  if (!(await ensureAdmin(req, res))) return;
  const email = (req.body.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "An email is required" });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ error: "Someone with that email already has an account" });

  await prisma.invite.deleteMany({ where: { email, teamId: null, usedAt: null } });

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const invite = await prisma.invite.create({
    data: {
      teamId: null,
      email,
      role: "COACH",
      newTeam: true,
      accessLevel: "FULL",
      token,
      invitedById: req.user!.userId,
      expiresAt,
    },
  });
  res.status(201).json(invite);
}

export async function revokeHeadCoachInvite(req: Request, res: Response) {
  if (!(await ensureAdmin(req, res))) return;
  const invite = await prisma.invite.findUnique({ where: { id: req.params.id } });
  if (!invite || !invite.newTeam || invite.role !== "COACH") return res.status(404).json({ error: "Not found" });
  await prisma.invite.delete({ where: { id: invite.id } });
  res.status(204).send();
}

// Suspend/unsuspend a head coach's OWN login only — their assistant
// coaches and athletes keep working normally, and all of the team's data
// stays exactly as it is. Un-suspending restores access immediately.
export async function setHeadCoachSuspended(req: Request, res: Response) {
  if (!(await ensureAdmin(req, res))) return;
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.role !== "COACH" || !target.isHeadCoach) {
    return res.status(404).json({ error: "Not found" });
  }
  if (target.isPlatformAdmin) return res.status(400).json({ error: "Can't suspend the platform admin's own account." });

  const suspended = !!req.body.suspended;
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { suspended },
    select: { id: true, name: true, email: true, suspended: true },
  });
  res.json(updated);
}

// Permanently deletes a head coach AND their entire team — every
// assistant coach, athlete, program, workout log, test result, and chat
// message on it. This can't be undone, which the frontend confirms
// before ever calling this.
export async function deleteHeadCoach(req: Request, res: Response) {
  if (!(await ensureAdmin(req, res))) return;
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.role !== "COACH" || !target.isHeadCoach) {
    return res.status(404).json({ error: "Not found" });
  }
  if (target.isPlatformAdmin) return res.status(400).json({ error: "Can't delete the platform admin's own account." });

  const teamId = target.teamId;
  await prisma.$transaction([
    // Programs (and their phases/weeks/days/exercises/assignments, via
    // cascade) have to go before the users who created them, since
    // Program.createdById would otherwise block deleting those users.
    prisma.program.deleteMany({ where: { teamId } }),
    // Deleting every user on the team cascades their workout logs, test
    // results, wearable data, chat messages, coach/athlete access grants,
    // and any invites they sent.
    prisma.user.deleteMany({ where: { teamId } }),
    // Whatever's left (the exercise/test-type libraries, any remaining
    // invites) cascades automatically when the team itself goes.
    prisma.team.delete({ where: { id: teamId } }),
  ]);
  res.status(204).send();
}

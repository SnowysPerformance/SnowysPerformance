import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { signToken } from "../utils/jwt";

const INVITE_TTL_DAYS = 14;

// Coach-only: generate a fresh invite link for a specific email address, to
// join THIS team — either as an athlete, or as an assistant coach (FULL
// access to every athlete, or RESTRICTED to a chosen list). Only the head
// coach can send an assistant-coach invite; any coach can invite an
// athlete. Handing someone a whole separate, brand-new team is now an
// admin-only action (see admin.controller.ts) — a regular coach can't do
// that here anymore.
export async function createInvite(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Only coaches can send invites" });
  const email = (req.body.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "An email is required" });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ error: "Someone with that email already has an account" });

  const role = req.body.role === "COACH" ? "COACH" : "ATHLETE";

  let accessLevel: "FULL" | "RESTRICTED" = "FULL";
  let athleteAccessIds: string[] = [];

  if (role === "COACH") {
    // Inviting an assistant coach changes team membership/permissions, so
    // only the head coach may send one — an assistant coach can't grant
    // themselves (or a friend) that ability.
    const inviter = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { isHeadCoach: true } });
    if (!inviter?.isHeadCoach) {
      return res.status(403).json({ error: "Only the head coach can invite an assistant coach to this team." });
    }
    accessLevel = req.body.accessLevel === "RESTRICTED" ? "RESTRICTED" : "FULL";
    if (accessLevel === "RESTRICTED") {
      const requested = Array.isArray(req.body.athleteIds) ? req.body.athleteIds.filter((x: any) => typeof x === "string") : [];
      const valid = await prisma.user.findMany({
        where: { id: { in: requested }, teamId: req.user!.teamId, role: "ATHLETE" },
        select: { id: true },
      });
      athleteAccessIds = valid.map((v) => v.id);
    }
  }

  // Replace any earlier unused invite to the same email so there's only
  // ever one live link per person.
  await prisma.invite.deleteMany({ where: { teamId: req.user!.teamId, email, usedAt: null } });

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const invite = await prisma.invite.create({
    data: {
      teamId: req.user!.teamId,
      email,
      role,
      newTeam: false,
      accessLevel,
      athleteAccessIds: athleteAccessIds.length ? athleteAccessIds : undefined,
      token,
      invitedById: req.user!.userId,
      expiresAt,
    },
  });
  res.status(201).json(invite);
}

export async function listInvites(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const invites = await prisma.invite.findMany({ where: { teamId: req.user!.teamId }, orderBy: { createdAt: "desc" } });
  res.json(invites);
}

export async function revokeInvite(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const invite = await prisma.invite.findUnique({ where: { id: req.params.id } });
  if (!invite || invite.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  await prisma.invite.delete({ where: { id: invite.id } });
  res.status(204).send();
}

// Public — looked up by an unguessable token, not authenticated, since the
// person clicking the link doesn't have an account yet.
export async function getInviteByToken(req: Request, res: Response) {
  const invite = await prisma.invite.findUnique({
    where: { token: req.params.token },
    include: { team: { select: { name: true } }, invitedBy: { select: { name: true } } },
  });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return res.status(404).json({ error: "This invite link is invalid or has expired. Ask whoever sent it for a new one." });
  }
  res.json({
    email: invite.email,
    role: invite.role,
    newTeam: invite.newTeam,
    accessLevel: invite.accessLevel,
    athleteCount: invite.accessLevel === "RESTRICTED" && Array.isArray(invite.athleteAccessIds) ? (invite.athleteAccessIds as string[]).length : 0,
    teamName: invite.newTeam ? null : invite.team?.name || null,
    invitedByName: invite.invitedBy.name,
  });
}

export async function acceptInvite(req: Request, res: Response) {
  const { token, name, password, teamName } = req.body;
  if (!token || !name || !password) return res.status(400).json({ error: "Missing invite token, name, or password" });

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return res.status(400).json({ error: "This invite link is invalid or has expired. Ask whoever sent it for a new one." });
  }
  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) return res.status(409).json({ error: "An account with that email already exists — try logging in instead." });

  let teamId = invite.teamId;
  if (invite.newTeam) {
    const team = await prisma.team.create({ data: { name: (teamName || "").trim() || `${name}'s Team` } });
    teamId = team.id;
  }
  if (!teamId) return res.status(400).json({ error: "This invite is missing its team — ask whoever sent it for a new one." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: invite.email,
      passwordHash,
      name,
      role: invite.role,
      teamId,
      accessLevel: invite.role === "COACH" && !invite.newTeam ? invite.accessLevel : "FULL",
      // Accepting an admin-sent "new team" invite makes you that new
      // team's head coach — its sole owner, who can invite/manage
      // assistant coaches. A same-team co-coach invite never sets this.
      isHeadCoach: invite.role === "COACH" && invite.newTeam,
    },
  });

  if (invite.role === "COACH" && !invite.newTeam && invite.accessLevel === "RESTRICTED" && Array.isArray(invite.athleteAccessIds)) {
    const ids = (invite.athleteAccessIds as string[]).filter((id) => typeof id === "string");
    if (ids.length) {
      await prisma.coachAthleteAccess.createMany({
        data: ids.map((athleteId) => ({ coachId: user.id, athleteId })),
        skipDuplicates: true,
      });
    }
  }

  // If a RESTRICTED coach invited this new ATHLETE onto the team, give that
  // coach edit access to the athlete they just brought on — same rule as
  // adding an athlete directly (see autoGrantIfRestricted).
  if (invite.role === "ATHLETE") {
    const inviter = await prisma.user.findUnique({ where: { id: invite.invitedById }, select: { accessLevel: true } });
    if (inviter?.accessLevel === "RESTRICTED") {
      await prisma.coachAthleteAccess.upsert({
        where: { coachId_athleteId: { coachId: invite.invitedById, athleteId: user.id } },
        update: {},
        create: { coachId: invite.invitedById, athleteId: user.id },
      });
    }
  }

  await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });

  const jwtToken = signToken({ userId: user.id, role: user.role as "COACH" | "ATHLETE", teamId });
  res.status(201).json({
    token: jwtToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, teamId, isHeadCoach: user.isHeadCoach, isPlatformAdmin: user.isPlatformAdmin },
  });
}

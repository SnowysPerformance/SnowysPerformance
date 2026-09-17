import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { signToken } from "../utils/jwt";

const INVITE_TTL_DAYS = 14;

// Coach-only: generate a fresh invite link for a specific email address —
// for an athlete, or (role: "COACH") for another coach to join and help run
// the same team. This is now the ONLY way any account gets created: there's
// no more open self-registration for athletes with a Team ID, and no more
// open "create a team" sign-up for anyone off the street to become a coach.
export async function createInvite(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Only coaches can send invites" });
  const email = (req.body.email || "").trim().toLowerCase();
  const role = req.body.role === "COACH" ? "COACH" : "ATHLETE";
  if (!email) return res.status(400).json({ error: "An email is required" });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ error: "Someone with that email already has an account" });

  // Replace any earlier unused invite to the same email so there's only
  // ever one live link per person.
  await prisma.invite.deleteMany({ where: { teamId: req.user!.teamId, email, usedAt: null } });

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const invite = await prisma.invite.create({
    data: { teamId: req.user!.teamId, email, role, token, invitedById: req.user!.userId, expiresAt },
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
  const invite = await prisma.invite.findUnique({ where: { token: req.params.token }, include: { team: { select: { name: true } } } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return res.status(404).json({ error: "This invite link is invalid or has expired. Ask whoever sent it for a new one." });
  }
  res.json({ email: invite.email, teamName: invite.team.name, role: invite.role });
}

export async function acceptInvite(req: Request, res: Response) {
  const { token, name, password } = req.body;
  if (!token || !name || !password) return res.status(400).json({ error: "Missing invite token, name, or password" });

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return res.status(400).json({ error: "This invite link is invalid or has expired. Ask whoever sent it for a new one." });
  }
  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) return res.status(409).json({ error: "An account with that email already exists — try logging in instead." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: invite.email, passwordHash, name, role: invite.role, teamId: invite.teamId },
  });
  await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });

  const jwtToken = signToken({ userId: user.id, role: invite.role as "COACH" | "ATHLETE", teamId: invite.teamId });
  res.status(201).json({ token: jwtToken, user: { id: user.id, name: user.name, email: user.email, role: user.role, teamId: invite.teamId } });
}

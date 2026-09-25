import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { signToken } from "../utils/jwt";

// Open self-registration — anyone spinning up a brand-new team and coach
// account with no invite, or an athlete pasting in a Team ID — has been
// removed on purpose. The ONLY way any account (coach or athlete) gets
// created now is by accepting an invite an existing coach generated for
// that exact email address (see invites.controller.ts). Coaches can also
// still create an athlete login directly from the roster page, which stays
// in teams.controller.ts since that already requires the coach to be
// logged in and isn't the open door this closes. A coach who already has
// an account can still start an additional, brand-new team of their own at
// any time — see createTeam below — since that doesn't open the platform
// to strangers the way open registration did.

export async function login(req: Request, res: Response) {
  const email = String(req.body.email || "").trim();
  const { password } = req.body;
  if (!email || !password) return res.status(401).json({ error: "Invalid email or password" });
  // Case-insensitive on purpose: emails are stored lowercase going forward
  // (see createAthlete/updateAthlete/updateMe/invites), but this also still
  // matches any older account whose email was saved with different casing,
  // so nobody gets locked out over a capital letter.
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken({ userId: user.id, role: user.role as "COACH" | "ATHLETE", teamId: user.teamId });
  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId,
      isHeadCoach: user.isHeadCoach, isPlatformAdmin: user.isPlatformAdmin,
    },
  });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({
    id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId,
    isHeadCoach: user.isHeadCoach, isPlatformAdmin: user.isPlatformAdmin,
  });
}

// Self-service: the logged-in user changes their own name and/or email
// (their login username). Either field can be left out to leave it as-is.
export async function updateMe(req: Request, res: Response) {
  const current = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!current) return res.status(404).json({ error: "Not found" });

  const { name, email } = req.body;
  const data: any = {};
  if (name !== undefined && name.trim()) data.name = name.trim();
  if (email !== undefined && email.trim()) {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== current.email.toLowerCase()) {
      const existing = await prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: "insensitive" } } });
      if (existing) return res.status(409).json({ error: "Email already in use" });
      data.email = normalizedEmail;
    }
  }

  const updated = await prisma.user.update({ where: { id: current.id }, data });
  res.json({
    id: updated.id, name: updated.name, email: updated.email, role: updated.role, teamId: updated.teamId,
    isHeadCoach: updated.isHeadCoach, isPlatformAdmin: updated.isPlatformAdmin,
  });
}

// Self-service password change — requires the current password so someone
// with a stolen login session can't lock the real owner out.
export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "currentPassword and newPassword are required" });
  if (String(newPassword).length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: "Not found" });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.status(204).send();
}

// Every team this coach belongs to (see TeamMembership), so the frontend
// can render a team switcher. Marks which one is currently active (the
// team the rest of the app is scoped to right now).
export async function listMyTeams(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const memberships = await prisma.teamMembership.findMany({
    where: { userId: req.user!.userId },
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(
    memberships.map((m) => ({
      teamId: m.teamId,
      teamName: m.team.name,
      isHeadCoach: m.isHeadCoach,
      accessLevel: m.accessLevel,
      active: m.teamId === req.user!.teamId,
    }))
  );
}

// Self-serve: any coach can spin up a brand-new team on their own, no
// admin approval needed — they become its sole, full-access head coach
// and are switched into it immediately. They keep membership in every
// other team they already belonged to and can switch back any time (see
// switchTeam below); this never touches an existing team's data.
export async function createTeam(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "A team name is required" });

  const team = await prisma.team.create({ data: { name } });
  await prisma.teamMembership.create({
    data: { userId: req.user!.userId, teamId: team.id, isHeadCoach: true, accessLevel: "FULL" },
  });

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { teamId: team.id, isHeadCoach: true, accessLevel: "FULL" },
  });

  const token = signToken({ userId: updated.id, role: updated.role as "COACH" | "ATHLETE", teamId: updated.teamId });
  res.status(201).json({
    token,
    user: {
      id: updated.id, name: updated.name, email: updated.email, role: updated.role, teamId: updated.teamId,
      isHeadCoach: updated.isHeadCoach, isPlatformAdmin: updated.isPlatformAdmin,
    },
  });
}

// Switch which of a coach's teams is "active." Every other endpoint in the
// app scopes its data by the team on the User row (req.user.teamId), so
// this copies the chosen membership's role/access onto that row and hands
// back a fresh token carrying the new team — the frontend saves it exactly
// like a fresh login and reloads.
export async function switchTeam(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: req.user!.userId, teamId: req.params.teamId } },
  });
  if (!membership) return res.status(404).json({ error: "You're not a member of that team" });

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { teamId: membership.teamId, isHeadCoach: membership.isHeadCoach, accessLevel: membership.accessLevel },
  });

  const token = signToken({ userId: updated.id, role: updated.role as "COACH" | "ATHLETE", teamId: updated.teamId });
  res.json({
    token,
    user: {
      id: updated.id, name: updated.name, email: updated.email, role: updated.role, teamId: updated.teamId,
      isHeadCoach: updated.isHeadCoach, isPlatformAdmin: updated.isPlatformAdmin,
    },
  });
}

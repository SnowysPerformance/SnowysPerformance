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
// logged in and isn't the open door this closes.

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken({ userId: user.id, role: user.role as "COACH" | "ATHLETE", teamId: user.teamId });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId } });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId });
}

// Self-service: the logged-in user changes their own name and/or email
// (their login username). Either field can be left out to leave it as-is.
export async function updateMe(req: Request, res: Response) {
  const current = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!current) return res.status(404).json({ error: "Not found" });

  const { name, email } = req.body;
  const data: any = {};
  if (name !== undefined && name.trim()) data.name = name.trim();
  if (email !== undefined && email.trim() && email.trim() !== current.email) {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) return res.status(409).json({ error: "Email already in use" });
    data.email = email.trim();
  }

  const updated = await prisma.user.update({ where: { id: current.id }, data });
  res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, teamId: updated.teamId });
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

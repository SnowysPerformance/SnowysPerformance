import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { signToken } from "../utils/jwt";

export async function registerTeamAndCoach(req: Request, res: Response) {
  const { teamName, name, email, password } = req.body;
  if (!teamName || !name || !email || !password) {
    return res.status(400).json({ error: "teamName, name, email, and password are required" });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const team = await prisma.team.create({ data: { name: teamName } });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: "COACH", teamId: team.id },
  });

  const token = signToken({ userId: user.id, role: "COACH", teamId: team.id });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, teamId: team.id },
    team,
  });
}

export async function registerAthlete(req: Request, res: Response) {
  const { teamId, name, email, password } = req.body;
  if (!teamId || !name || !email || !password) {
    return res.status(400).json({ error: "teamId, name, email, and password are required" });
  }
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return res.status(404).json({ error: "Team not found. Ask your coach for the Team ID." });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: "ATHLETE", teamId },
  });

  const token = signToken({ userId: user.id, role: "ATHLETE", teamId });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, teamId } });
}

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

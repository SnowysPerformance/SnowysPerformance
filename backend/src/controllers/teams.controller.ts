import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";

export async function listAthletes(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athletes = await prisma.user.findMany({
    where: { teamId: req.user!.teamId, role: "ATHLETE" },
    select: { id: true, name: true, email: true },
  });
  res.json(athletes);
}

export async function createAthlete(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const athlete = await prisma.user.create({
    data: { email, passwordHash, name, role: "ATHLETE", teamId: req.user!.teamId },
    select: { id: true, name: true, email: true },
  });
  res.status(201).json(athlete);
}

// Coach edits one of their athletes: name, email (their login username), and/or
// resets their password. Any field left out is left unchanged.
export async function updateAthlete(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athlete = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!athlete || athlete.teamId !== req.user!.teamId || athlete.role !== "ATHLETE") {
    return res.status(404).json({ error: "Not found" });
  }

  const { name, email, password } = req.body;
  const data: any = {};
  if (name !== undefined && name.trim()) data.name = name.trim();
  if (email !== undefined && email.trim() && email.trim() !== athlete.email) {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) return res.status(409).json({ error: "Email already in use" });
    data.email = email.trim();
  }
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({ where: { id: athlete.id }, data, select: { id: true, name: true, email: true } });
  res.json(updated);
}

// Permanently removes an athlete and (via cascading foreign keys) all of
// their workout logs, test results, and wearable data.
export async function deleteAthlete(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athlete = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!athlete || athlete.teamId !== req.user!.teamId || athlete.role !== "ATHLETE") {
    return res.status(404).json({ error: "Not found" });
  }
  await prisma.user.delete({ where: { id: athlete.id } });
  res.status(204).send();
}

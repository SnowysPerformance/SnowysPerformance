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

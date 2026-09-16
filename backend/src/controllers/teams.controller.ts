import { Request, Response } from "express";
import { prisma } from "../db";

export async function listAthletes(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athletes = await prisma.user.findMany({
    where: { teamId: req.user!.teamId, role: "ATHLETE" },
    select: { id: true, name: true, email: true },
  });
  res.json(athletes);
}

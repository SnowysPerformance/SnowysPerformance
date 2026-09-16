import { Request, Response } from "express";
import { computeFatigue } from "../services/fatigueEngine";
import { prisma } from "../db";

export async function getAthleteFatigue(req: Request, res: Response) {
  const athleteId = req.params.athleteId;
  if (req.user!.role === "ATHLETE" && athleteId !== req.user!.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const athlete = await prisma.user.findUnique({ where: { id: athleteId } });
  if (!athlete || athlete.teamId !== req.user!.teamId) return res.status(404).json({ error: "Athlete not found" });

  res.json(await computeFatigue(athleteId, req.user!.teamId));
}

export async function getTeamFatigue(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athletes = await prisma.user.findMany({ where: { teamId: req.user!.teamId, role: "ATHLETE" } });
  const results = await Promise.all(athletes.map((a) => computeFatigue(a.id, req.user!.teamId)));
  res.json(results);
}

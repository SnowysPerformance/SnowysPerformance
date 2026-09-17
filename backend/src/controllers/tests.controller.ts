import { Request, Response } from "express";
import { prisma } from "../db";
import { checkCanEditAthlete } from "../utils/permissions";

export async function createTestResult(req: Request, res: Response) {
  const { athleteId, testType, value, unit, date } = req.body;

  if (req.user!.role === "ATHLETE" && athleteId && athleteId !== req.user!.userId) {
    return res.status(403).json({ error: "Athletes can only log their own test results" });
  }
  const targetAthleteId = req.user!.role === "COACH" ? (athleteId || req.user!.userId) : req.user!.userId;
  if (req.user!.role === "COACH") {
    const permission = await checkCanEditAthlete(req, targetAthleteId);
    if (!permission.ok) return res.status(permission.status).json({ error: permission.error });
  }

  const result = await prisma.testResult.create({
    data: { teamId: req.user!.teamId, athleteId: targetAthleteId, testType, value, unit, date: new Date(date) },
  });
  res.status(201).json(result);
}

export async function listTestResults(req: Request, res: Response) {
  const athleteIdFilter = req.query.athleteId as string | undefined;
  const where: any = { teamId: req.user!.teamId };
  if (req.user!.role === "ATHLETE") where.athleteId = req.user!.userId;
  else if (athleteIdFilter) where.athleteId = athleteIdFilter;

  const results = await prisma.testResult.findMany({ where, orderBy: { date: "desc" } });
  res.json(results);
}

export async function deleteTestResult(req: Request, res: Response) {
  const result = await prisma.testResult.findUnique({ where: { id: req.params.id } });
  if (!result || result.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  if (req.user!.role === "ATHLETE" && result.athleteId !== req.user!.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.user!.role === "COACH") {
    const permission = await checkCanEditAthlete(req, result.athleteId);
    if (!permission.ok) return res.status(permission.status).json({ error: permission.error });
  }
  await prisma.testResult.delete({ where: { id: result.id } });
  res.status(204).send();
}

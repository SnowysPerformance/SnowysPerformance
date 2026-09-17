import { Request, Response } from "express";
import { prisma } from "../db";
import { checkCanEditAthlete } from "../utils/permissions";

function computeVolumeLoad(type: string, sets: any): number {
  if (type !== "weighted") return 0;
  if (!Array.isArray(sets)) return 0;
  return sets.reduce((sum: number, s: any) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
}

function buildTestValue(type: string, sets: any): { value: number; unit: string } {
  const rows = Array.isArray(sets) ? sets : [];
  if (type === "weighted") {
    const valid = rows.filter((s: any) => s.weight > 0 && s.reps > 0);
    return { value: valid.length ? Math.max(...valid.map((s: any) => s.weight)) : 0, unit: "lb" };
  }
  if (type === "bodyweight" || type === "banded") {
    const reps = rows.map((s: any) => s.reps || 0);
    return { value: reps.length ? Math.max(...reps) : 0, unit: "reps" };
  }
  if (type === "sprint") {
    const times = rows.map((s: any) => s.duration).filter((x: any) => x > 0);
    return { value: times.length ? Math.min(...times) : 0, unit: "sec" };
  }
  const times = rows.map((s: any) => s.duration || 0);
  return { value: times.length ? Math.max(...times) : 0, unit: "sec" };
}

export async function createWorkoutLog(req: Request, res: Response) {
  const {
    athleteId, date, label, exerciseName, type,
    methodName, band, distance, resisted, resistance,
    restSeconds, isWarmup, isTest, sets, notes,
    // Optional overrides so "Mark as Test" can record a test type/value/unit
    // picked directly (e.g. "Vertical Jump" in inches) instead of always
    // deriving the test result from the logged sets.
    testType, testUnit, testValue,
  } = req.body;

  if (req.user!.role === "ATHLETE" && athleteId && athleteId !== req.user!.userId) {
    return res.status(403).json({ error: "Athletes can only log their own workouts" });
  }
  const targetAthleteId = req.user!.role === "COACH" ? (athleteId || req.user!.userId) : req.user!.userId;
  if (req.user!.role === "COACH") {
    const permission = await checkCanEditAthlete(req, targetAthleteId);
    if (!permission.ok) return res.status(permission.status).json({ error: permission.error });
  }
  const t = type || "weighted";

  const log = await prisma.workoutLog.create({
    data: {
      teamId: req.user!.teamId,
      athleteId: targetAthleteId,
      date: new Date(date),
      label: label || null,
      exerciseName,
      type: t,
      methodName: methodName || null,
      band: band || null,
      distance: distance || null,
      resisted: !!resisted,
      resistance: resistance || null,
      restSeconds: restSeconds || null,
      isWarmup: !!isWarmup,
      isTest: !!isTest,
      sets,
      volumeLoad: computeVolumeLoad(t, sets),
      notes,
    },
  });

  // Marked as a test? Also drop it into TestResult so it shows on the Testing tab automatically.
  if (isTest) {
    const hasDirectValue = testValue !== undefined && testValue !== null && testValue !== "";
    const { value, unit } = hasDirectValue ? { value: Number(testValue), unit: testUnit || "" } : buildTestValue(t, sets);
    const resolvedTestType = hasDirectValue && testType ? testType : exerciseName;
    await prisma.testResult.create({
      data: { teamId: req.user!.teamId, athleteId: targetAthleteId, testType: resolvedTestType, unit, date: new Date(date), value },
    });
  }

  res.status(201).json(log);
}

export async function listWorkoutLogs(req: Request, res: Response) {
  const athleteIdFilter = req.query.athleteId as string | undefined;
  const where: any = { teamId: req.user!.teamId };
  if (req.user!.role === "ATHLETE") where.athleteId = req.user!.userId;
  else if (athleteIdFilter) where.athleteId = athleteIdFilter;

  const logs = await prisma.workoutLog.findMany({ where, orderBy: { date: "desc" } });
  res.json(logs);
}

export async function deleteWorkoutLog(req: Request, res: Response) {
  const log = await prisma.workoutLog.findUnique({ where: { id: req.params.id } });
  if (!log || log.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  if (req.user!.role === "ATHLETE" && log.athleteId !== req.user!.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.user!.role === "COACH") {
    const permission = await checkCanEditAthlete(req, log.athleteId);
    if (!permission.ok) return res.status(permission.status).json({ error: permission.error });
  }
  await prisma.workoutLog.delete({ where: { id: log.id } });
  res.status(204).send();
}

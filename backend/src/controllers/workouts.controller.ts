import { Request, Response } from "express";
import { prisma } from "../db";
import { checkCanEditAthlete } from "../utils/permissions";
import { computeBestsFromLogs } from "../utils/prs";

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

// Re-scans every weighted set this athlete has ever logged for one exercise
// and updates (or clears) their PersonalRecord row to match. Called after
// every create and delete so "current all-time best" never drifts, even
// when the log that set the record gets removed later. Returns the freshly
// computed bests either way.
async function recomputeBests(teamId: string, athleteId: string, exerciseName: string) {
  const logs = await prisma.workoutLog.findMany({
    where: { athleteId, exerciseName, type: "weighted", isWarmup: false },
    select: { id: true, date: true, sets: true },
  });
  const bests = computeBestsFromLogs(logs);

  if (bests.bestWeight <= 0 && bests.bestE1rm <= 0) {
    // Nothing left to record this exercise's best from (e.g. the only log
    // of it was just deleted) — drop the row rather than leave a stale zero.
    await prisma.personalRecord.deleteMany({ where: { athleteId, exerciseName } });
    return bests;
  }

  await prisma.personalRecord.upsert({
    where: { athleteId_exerciseName: { athleteId, exerciseName } },
    create: { teamId, athleteId, exerciseName, ...bests },
    update: bests,
  });
  return bests;
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

  // Snapshot the athlete's best for this exercise *before* this log exists,
  // so afterward we can tell whether it just became a new all-time best.
  let prevBest: { bestWeight: number; bestE1rm: number } | null = null;
  if (t === "weighted" && !isWarmup) {
    prevBest = await prisma.personalRecord.findUnique({
      where: { athleteId_exerciseName: { athleteId: targetAthleteId, exerciseName } },
      select: { bestWeight: true, bestE1rm: true },
    });
  }

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

  // Update this exercise's all-time-best record and tell the frontend
  // whether this exact log is the new one, so it can show a real-time
  // "new PR" badge without waiting on anything else.
  let isWeightPR = false;
  let isE1rmPR = false;
  let bests: { bestWeight: number; bestE1rm: number } | null = null;
  if (t === "weighted" && !isWarmup) {
    bests = await recomputeBests(req.user!.teamId, targetAthleteId, exerciseName);
    isWeightPR = bests.bestWeight > (prevBest?.bestWeight || 0);
    isE1rmPR = bests.bestE1rm > (prevBest?.bestE1rm || 0);
  }

  res.status(201).json({ ...log, isWeightPR, isE1rmPR, bestWeight: bests?.bestWeight, bestE1rm: bests?.bestE1rm });
}

export async function listWorkoutLogs(req: Request, res: Response) {
  const athleteIdFilter = req.query.athleteId as string | undefined;
  const where: any = { teamId: req.user!.teamId };
  if (req.user!.role === "ATHLETE") where.athleteId = req.user!.userId;
  else if (athleteIdFilter) where.athleteId = athleteIdFilter;

  const logs = await prisma.workoutLog.findMany({ where, orderBy: { date: "desc" } });
  res.json(logs);
}

// Every exercise this athlete has an all-time best recorded for — the Log
// tab shows the relevant one next to the exercise field as it's typed, and
// a summary of all of them can be shown anywhere without loading the
// athlete's full workout history.
export async function getPersonalBests(req: Request, res: Response) {
  const athleteId = req.user!.role === "ATHLETE" ? req.user!.userId : (req.query.athleteId as string | undefined);
  if (!athleteId) return res.status(400).json({ error: "athleteId is required" });
  // Viewing doesn't need the edit-permission check (same as listWorkoutLogs
  // above) — every coach on the team can already see every athlete's
  // history, this just scopes it to the coach's own team.
  const records = await prisma.personalRecord.findMany({
    where: { teamId: req.user!.teamId, athleteId },
    orderBy: { exerciseName: "asc" },
  });
  res.json(records);
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
  // The record this log held (if any) may no longer be the athlete's best,
  // or may have been their only log of this exercise at all — recompute
  // from what's left so PersonalRecord never shows a stale/deleted set.
  if (log.type === "weighted" && !log.isWarmup) {
    await recomputeBests(log.teamId, log.athleteId, log.exerciseName);
  }
  res.status(204).send();
}

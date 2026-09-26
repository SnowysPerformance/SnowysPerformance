import { Request, Response } from "express";
import { prisma } from "../db";
import { e1rm } from "../utils/prs";

// Team leaderboards: strength (best e1RM + best top set), relative strength
// (best e1RM ÷ latest logged bodyweight), test results, and consistency
// (training days logged). Everything is scoped to the requester's own team
// only — athletes see their teammates, never another team. Only names and
// the ranked numbers are returned (no emails, notes, or other profile data).
//
// Computed fresh from WorkoutLog / TestResult on every request, the same way
// the Progress charts are, so it always agrees with what athletes see there.

// Test types that aren't a "performance" to rank (wearable/health readings,
// and bodyweight, which is only used for relative strength).
const NON_RANKED_TESTS = new Set([
  "bodyweight",
  "body weight",
  "whoop strain",
  "whoop recovery",
  "sleep score",
  "resting hr",
]);

// Timed tests (sprints, shuttles, etc.) — lower is better.
function lowerIsBetter(testName: string, unit: string) {
  const u = (unit || "").trim().toLowerCase();
  if (["s", "sec", "secs", "second", "seconds", "ms", "min", "time"].includes(u)) return true;
  return /sprint|shuttle|dash|time|split|pro agility|5-10-5/i.test(testName);
}

// "Back Squat", "back squat " and "BACK SQUAT" are the same lift.
function normalize(name: string) {
  return (name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

// Pick the most-used spelling of a name for display.
function displayName(counts: Map<string, number>) {
  let best = "";
  let bestCount = -1;
  counts.forEach((c, n) => {
    if (c > bestCount) {
      best = n;
      bestCount = c;
    }
  });
  return best;
}

function round(n: number, places = 1) {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

type Entry = { athleteId: string; name: string; value: number; secondary?: number | null; date?: string | null };

export async function getTeamLeaderboard(req: Request, res: Response) {
  const teamId = req.user!.teamId;

  const athletes = await prisma.user.findMany({
    where: { teamId, role: "ATHLETE", suspended: false },
    select: { id: true, name: true },
  });
  const nameById = new Map<string, string>(athletes.map((a: { id: string; name: string }) => [a.id, a.name] as [string, string]));
  const athleteIds: string[] = athletes.map((a: { id: string }) => a.id);

  if (athleteIds.length === 0) {
    return res.json({ athleteCount: 0, lifts: [], relative: [], tests: [], consistency: { days7: [], days30: [] } });
  }

  const [logs, tests] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { teamId, athleteId: { in: athleteIds }, isWarmup: false },
      select: { athleteId: true, date: true, exerciseName: true, type: true, sets: true },
    }),
    prisma.testResult.findMany({
      where: { teamId, athleteId: { in: athleteIds } },
      select: { athleteId: true, testType: true, value: true, unit: true, date: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // ---------- Strength: best e1RM + best top set per athlete per lift ----------
  type LiftBest = { e1rm: number; weight: number; date: Date };
  const liftBests = new Map<string, Map<string, LiftBest>>(); // lift -> athleteId -> best
  const liftSpellings = new Map<string, Map<string, number>>();

  for (const log of logs) {
    if (log.type && log.type !== "weighted") continue;
    const rows = Array.isArray(log.sets) ? (log.sets as any[]) : [];
    const valid = rows.filter((s) => Number(s?.weight) > 0 && Number(s?.reps) > 0);
    if (!valid.length) continue;
    const topWeight = Math.max(...valid.map((s) => Number(s.weight)));
    const topE1rm = Math.max(...valid.map((s) => e1rm(Number(s.weight), Number(s.reps))));

    const key = normalize(log.exerciseName);
    if (!key) continue;
    if (!liftSpellings.has(key)) liftSpellings.set(key, new Map());
    const sp = liftSpellings.get(key)!;
    sp.set(log.exerciseName.trim(), (sp.get(log.exerciseName.trim()) || 0) + 1);

    if (!liftBests.has(key)) liftBests.set(key, new Map());
    const byAthlete = liftBests.get(key)!;
    const prev = byAthlete.get(log.athleteId);
    if (!prev) {
      byAthlete.set(log.athleteId, { e1rm: topE1rm, weight: topWeight, date: log.date });
    } else {
      if (topE1rm > prev.e1rm) {
        prev.e1rm = topE1rm;
        prev.date = log.date;
      }
      if (topWeight > prev.weight) prev.weight = topWeight;
    }
  }

  // ---------- Latest bodyweight per athlete (from the "Bodyweight" test) ----------
  const bodyweight = new Map<string, number>();
  for (const t of tests) {
    const k = normalize(t.testType);
    if ((k === "bodyweight" || k === "body weight") && t.value > 0) {
      bodyweight.set(t.athleteId, t.value); // ordered by date asc, so last one wins
    }
  }

  const lifts: Array<{ name: string; unit: string; entries: Entry[] }> = [];
  const relative: Array<{ name: string; unit: string; entries: Entry[] }> = [];

  liftBests.forEach((byAthlete, key) => {
    const name = displayName(liftSpellings.get(key)!);
    const abs: Entry[] = [];
    const rel: Entry[] = [];
    byAthlete.forEach((b, athleteId) => {
      const athleteName = nameById.get(athleteId) || "Athlete";
      abs.push({ athleteId, name: athleteName, value: round(b.e1rm), secondary: round(b.weight), date: b.date.toISOString() });
      const bw = bodyweight.get(athleteId);
      if (bw) rel.push({ athleteId, name: athleteName, value: round(b.e1rm / bw, 2), secondary: round(b.e1rm), date: b.date.toISOString() });
    });
    abs.sort((a, b) => b.value - a.value);
    rel.sort((a, b) => b.value - a.value);
    lifts.push({ name, unit: "lb", entries: abs });
    if (rel.length) relative.push({ name, unit: "× BW", entries: rel });
  });

  // Lifts with the most athletes first — those are the most useful boards.
  lifts.sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));
  relative.sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));

  // ---------- Tests: each athlete's best result per test ----------
  const testBests = new Map<string, Map<string, { value: number; date: Date }>>();
  const testSpellings = new Map<string, Map<string, number>>();
  const testUnits = new Map<string, Map<string, number>>();

  for (const t of tests) {
    const key = normalize(t.testType);
    if (!key || NON_RANKED_TESTS.has(key)) continue;
    if (!testSpellings.has(key)) {
      testSpellings.set(key, new Map());
      testUnits.set(key, new Map());
    }
    const sp = testSpellings.get(key)!;
    sp.set(t.testType.trim(), (sp.get(t.testType.trim()) || 0) + 1);
    const un = testUnits.get(key)!;
    un.set((t.unit || "").trim(), (un.get((t.unit || "").trim()) || 0) + 1);
  }

  for (const t of tests) {
    const key = normalize(t.testType);
    if (!testSpellings.has(key)) continue;
    const name = displayName(testSpellings.get(key)!);
    const unit = displayName(testUnits.get(key)!);
    const lower = lowerIsBetter(name, unit);
    if (!testBests.has(key)) testBests.set(key, new Map());
    const byAthlete = testBests.get(key)!;
    const prev = byAthlete.get(t.athleteId);
    const better = !prev || (lower ? t.value < prev.value : t.value > prev.value);
    if (better && (t.value > 0 || !lower)) byAthlete.set(t.athleteId, { value: t.value, date: t.date });
  }

  const testBoards: Array<{ name: string; unit: string; lowerIsBetter: boolean; entries: Entry[] }> = [];
  testBests.forEach((byAthlete, key) => {
    const name = displayName(testSpellings.get(key)!);
    const unit = displayName(testUnits.get(key)!);
    const lower = lowerIsBetter(name, unit);
    const entries: Entry[] = [];
    byAthlete.forEach((b, athleteId) =>
      entries.push({ athleteId, name: nameById.get(athleteId) || "Athlete", value: round(b.value, 2), date: b.date.toISOString() })
    );
    entries.sort((a, b) => (lower ? a.value - b.value : b.value - a.value));
    if (entries.length) testBoards.push({ name, unit, lowerIsBetter: lower, entries });
  });
  testBoards.sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));

  // ---------- Consistency: distinct training days logged ----------
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  function consistency(days: number): Entry[] {
    const cutoff = now - days * DAY;
    const daySets = new Map<string, Set<string>>();
    athleteIds.forEach((id) => daySets.set(id, new Set()));
    for (const log of logs) {
      const t = log.date.getTime();
      if (t < cutoff || t > now + DAY) continue;
      daySets.get(log.athleteId)?.add(log.date.toISOString().slice(0, 10));
    }
    const entries: Entry[] = [];
    daySets.forEach((set, athleteId) => entries.push({ athleteId, name: nameById.get(athleteId) || "Athlete", value: set.size }));
    return entries.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  }

  res.json({
    athleteCount: athletes.length,
    lifts,
    relative,
    tests: testBoards,
    consistency: { days7: consistency(7), days30: consistency(30) },
  });
}

import { prisma } from "../db";

export interface ProgressTrendResult {
  athleteId: string;
  trend: "IMPROVING" | "BUILDING" | "PLATEAUING" | "DECLINING" | "INSUFFICIENT_DATA";
  recentPRCount: number;
  volumeChangePct: number | null;
  weeksOfHistory: number;
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Progress trend answers a different question than the fatigue/deload flag:
 * not "is this athlete's load risky right now" but "is their training
 * actually producing results lately." A coach reading both together gets
 * the real picture — e.g. high load + still hitting PRs is often fine to
 * push through, while high load + stalled progress is exactly when a
 * deload pays off.
 *
 * Signals used (in priority order):
 *  1. New all-time weight PRs in the last 14 days — the clearest sign
 *     training is working, regardless of what volume is doing.
 *  2. Training volume over the last 14 days vs. the 14 days before that —
 *     a simple, transparent proxy for whether they're building, holding
 *     steady, or backing off. Uses total logged volume load, same
 *     definition of "load" as the fatigue engine's acute/chronic numbers.
 *
 * Same philosophy as the fatigue engine: simple and inspectable rather
 * than a black box, so a coach can see exactly why a label was applied.
 */
export async function computeProgressTrend(athleteId: string, teamId: string): Promise<ProgressTrendResult> {
  const now = new Date();

  // All logged volume (any exercise type), matching how "load" is defined
  // in the fatigue engine — used only for the volume-trend comparison.
  const allLogs = await prisma.workoutLog.findMany({
    where: { athleteId, teamId },
    select: { date: true, volumeLoad: true },
    orderBy: { date: "asc" },
  });

  if (allLogs.length === 0) {
    return {
      athleteId,
      trend: "INSUFFICIENT_DATA",
      recentPRCount: 0,
      volumeChangePct: null,
      weeksOfHistory: 0,
      message: "No logged training data yet.",
    };
  }

  const earliestMs = allLogs[0].date.getTime();
  const daysOfHistory = (now.getTime() - earliestMs) / DAY_MS;
  const weeksOfHistory = Math.round((daysOfHistory / 7) * 10) / 10;

  if (daysOfHistory < 14) {
    return {
      athleteId,
      trend: "INSUFFICIENT_DATA",
      recentPRCount: 0,
      volumeChangePct: null,
      weeksOfHistory,
      message: `Still building a training history (${Math.max(1, Math.round(daysOfHistory))} of 14 days) before a progress trend can be calculated.`,
    };
  }

  const since14 = new Date(now.getTime() - 14 * DAY_MS);
  const since28 = new Date(now.getTime() - 28 * DAY_MS);
  const recentTotal = allLogs.filter((l) => l.date >= since14).reduce((s, l) => s + l.volumeLoad, 0);
  const priorTotal = allLogs.filter((l) => l.date >= since28 && l.date < since14).reduce((s, l) => s + l.volumeLoad, 0);
  const volumeChangePct = priorTotal > 0 ? Math.round(((recentTotal - priorTotal) / priorTotal) * 1000) / 10 : null;

  // Weighted-exercise logs only, full history, for genuine all-time-PR
  // detection (mirrors the logic used on the athlete's own Progress page).
  const weightedLogs = await prisma.workoutLog.findMany({
    where: { athleteId, teamId, isWarmup: false, type: "weighted" },
    select: { date: true, exerciseName: true, sets: true },
    orderBy: { date: "asc" },
  });

  const bestWeight: Record<string, number> = {};
  let recentPRCount = 0;

  for (const log of weightedLogs) {
    const sets = Array.isArray(log.sets) ? (log.sets as any[]) : [];
    const validWeights = sets
      .filter((s) => s && typeof s.weight === "number" && typeof s.reps === "number" && s.weight > 0 && s.reps > 0)
      .map((s) => s.weight as number);
    if (validWeights.length === 0) continue;

    const topWeight = Math.max(...validWeights);
    const prevBest = bestWeight[log.exerciseName] || 0;
    if (topWeight > prevBest) {
      bestWeight[log.exerciseName] = topWeight;
      if (log.date >= since14) recentPRCount++;
    }
  }

  let trend: ProgressTrendResult["trend"];
  let message: string;

  if (recentPRCount > 0) {
    trend = "IMPROVING";
    message = `Hit ${recentPRCount} new all-time PR${recentPRCount > 1 ? "s" : ""} in the last 2 weeks — training is producing results.`;
  } else if (volumeChangePct === null) {
    trend = "INSUFFICIENT_DATA";
    message = "Not enough history yet to compare recent volume against prior weeks.";
  } else if (volumeChangePct >= 10) {
    trend = "BUILDING";
    message = `Training volume is up ${volumeChangePct}% over the last 2 weeks vs. the 2 weeks before. No new PRs yet, but load is climbing.`;
  } else if (volumeChangePct <= -15) {
    trend = "DECLINING";
    message = `Training volume is down ${Math.abs(volumeChangePct)}% with no new PRs recently — worth checking in on this athlete.`;
  } else {
    trend = "PLATEAUING";
    message = "Volume and PRs have been flat for a couple weeks — could be a good time to change stimulus or check in.";
  }

  return { athleteId, trend, recentPRCount, volumeChangePct, weeksOfHistory, message };
}

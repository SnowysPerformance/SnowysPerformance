// Shared PR (personal record) + method-color helpers.
// Mirrors the logic from the reference artifact's computePRs(), adapted to
// this app's data model: one WorkoutLog row = one exercise on one date
// (the artifact groups several exercises under one "session").

export function e1rm(weight: number, reps: number) {
  return reps <= 1 ? weight : weight * (1 + reps / 30);
}

export type PRInfo = { topWeight: number; topE1rm: number; weightPR: boolean; e1rmPR: boolean };

// logs: the WorkoutLog[] array as returned by GET /api/workouts (any order).
// Returns:
//   prMap      — keyed by log.id: was *this* log a new all-time best when it happened?
//   bestWeight — keyed by exerciseName: the athlete's current all-time best top set (lb)
//   bestE1rm   — keyed by exerciseName: the athlete's current all-time best calculated 1RM
export function computePRs(logs: any[]) {
  const ordered = [...logs]
    .filter((l) => (l.type === "weighted" || !l.type) && !l.isWarmup)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const bestWeight: Record<string, number> = {};
  const bestE1rm: Record<string, number> = {};
  const prMap: Record<string, PRInfo> = {};

  ordered.forEach((l) => {
    const valid = (l.sets || []).filter((s: any) => s.weight > 0 && s.reps > 0);
    if (!valid.length) return;
    const topWeight = Math.max(...valid.map((s: any) => s.weight));
    const topE1rm = Math.max(...valid.map((s: any) => e1rm(s.weight, s.reps)));
    const prevW = bestWeight[l.exerciseName] || 0;
    const prevE = bestE1rm[l.exerciseName] || 0;
    prMap[l.id] = { topWeight, topE1rm, weightPR: topWeight > prevW, e1rmPR: topE1rm > prevE };
    bestWeight[l.exerciseName] = Math.max(prevW, topWeight);
    bestE1rm[l.exerciseName] = Math.max(prevE, topE1rm);
  });

  return { prMap, bestWeight, bestE1rm };
}

// A small distinguishable palette for coloring by training method (or by athlete).
export const METHOD_PALETTE = ["#7EC8E3", "#E3B23C", "#B18CD9", "#6FA96A", "#E37C7C", "#D9A46C", "#7EE3C8"];

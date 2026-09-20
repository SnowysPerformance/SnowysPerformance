// Backend twin of frontend/src/lib/prs.ts's e1rm() — kept in sync on
// purpose so the "current best" this server stores always agrees with what
// the Progress tab charts client-side from the same logs.
export function e1rm(weight: number, reps: number) {
  return reps <= 1 ? weight : weight * (1 + reps / 30);
}

export type ComputedBests = {
  bestWeight: number;
  bestWeightDate: Date | null;
  bestWeightLogId: string | null;
  bestE1rm: number;
  bestE1rmDate: Date | null;
  bestE1rmLogId: string | null;
};

// Scans every non-warmup weighted WorkoutLog row for one athlete + exercise
// and returns their current all-time bests. Recomputing from scratch (rather
// than trying to incrementally patch a running max) is what keeps this
// correct even after an old log — possibly the one holding the record — gets
// deleted.
export function computeBestsFromLogs(logs: Array<{ id: string; date: Date; sets: any }>): ComputedBests {
  const bests: ComputedBests = {
    bestWeight: 0, bestWeightDate: null, bestWeightLogId: null,
    bestE1rm: 0, bestE1rmDate: null, bestE1rmLogId: null,
  };
  for (const log of logs) {
    const rows = Array.isArray(log.sets) ? log.sets : [];
    const valid = rows.filter((s: any) => Number(s.weight) > 0 && Number(s.reps) > 0);
    if (!valid.length) continue;
    const topWeight = Math.max(...valid.map((s: any) => Number(s.weight)));
    const topE1rm = Math.max(...valid.map((s: any) => e1rm(Number(s.weight), Number(s.reps))));
    if (topWeight > bests.bestWeight) {
      bests.bestWeight = topWeight;
      bests.bestWeightDate = log.date;
      bests.bestWeightLogId = log.id;
    }
    if (topE1rm > bests.bestE1rm) {
      bests.bestE1rm = topE1rm;
      bests.bestE1rmDate = log.date;
      bests.bestE1rmLogId = log.id;
    }
  }
  return bests;
}

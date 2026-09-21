// Shared helpers for computing an athlete's prescribed training target
// (a weight, from their best e1RM and the plan's %1RM or exact weight).
// Used both when a coach builds a plan (programs/[id]/page.tsx) and when
// an athlete logs a planned workout (workouts/page.tsx), so the two never
// disagree about what "today's weight" should be.

export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));
export const round5 = (n: number) => Math.round(n / 5) * 5;

export function computeBestE1rm(logs: any[]): Record<string, number> {
  const best: Record<string, number> = {};
  logs.forEach((l) => {
    if (l.type && l.type !== "weighted") return;
    const valid = (l.sets || []).filter((s: any) => s.weight > 0 && s.reps > 0);
    if (!valid.length) return;
    const top = Math.max(...valid.map((s: any) => e1rm(s.weight, s.reps)));
    if (!best[l.exerciseName] || top > best[l.exerciseName]) best[l.exerciseName] = top;
  });
  return best;
}

export function computedWeight(ex: any, bestE1rm: Record<string, number>): number | null {
  if (ex.type && ex.type !== "weighted") return null;
  if (ex.weight) return ex.weight; // a directly-entered weight always wins
  const max = bestE1rm[ex.exerciseName];
  if (!max || !ex.percentOfMax) return null;
  return round5((max * ex.percentOfMax) / 100);
}

export function targetLabel(ex: any, bestE1rm: Record<string, number>): string {
  if (!ex.type || ex.type === "weighted") {
    const w = computedWeight(ex, bestE1rm);
    return w ? `${w} lb` : "need 1RM";
  }
  if (ex.type === "banded") return ex.band || "";
  if (ex.type === "sprint") return `${ex.distance || ""}yd${ex.resisted ? " (resisted)" : ""}`;
  return "—";
}

// Per-set overrides: ex.setDetails, when present, is an array of
// { reps?, percentOfMax?, weight? } — one entry per set — for a
// ramping/wave-loading scheme where each set has its own target. These
// mirror computedWeight/targetLabel but read one set's own values.
export function hasSetDetails(ex: any): boolean {
  return Array.isArray(ex.setDetails) && ex.setDetails.length > 0;
}
export function computedWeightForSet(ex: any, entry: any, bestE1rm: Record<string, number>): number | null {
  if (ex.type && ex.type !== "weighted") return null;
  if (entry.weight) return Number(entry.weight);
  const max = bestE1rm[ex.exerciseName];
  const pct = entry.percentOfMax ? Number(entry.percentOfMax) : null;
  if (!max || !pct) return null;
  return round5((max * pct) / 100);
}
export function setTargetLabel(ex: any, entry: any, bestE1rm: Record<string, number>): string {
  if (!ex.type || ex.type === "weighted") {
    const w = computedWeightForSet(ex, entry, bestE1rm);
    return w ? `${w} lb` : "need 1RM";
  }
  return targetLabel(ex, bestE1rm);
}

// Groups a day's flat exercise list into display blocks: consecutive
// exercises sharing a groupId (a superset/circuit the coach grouped
// together) become one "group" block, everything else is a "single"
// block. Used by both the coach's plan builder and the athlete's
// day-log view so a superset looks the same -- grouped -- in both places.
export function buildDayBlocks(day: any) {
  const seen = new Set<string>();
  const blocks: any[] = [];
  let letterIdx = 0;
  (day.exercises || []).forEach((ex: any) => {
    if (ex.groupId) {
      if (seen.has(ex.groupId)) return;
      seen.add(ex.groupId);
      const members = day.exercises.filter((x: any) => x.groupId === ex.groupId);
      blocks.push({ type: "group", groupId: ex.groupId, label: ex.groupLabel, letter: String.fromCharCode(65 + letterIdx++), members });
    } else blocks.push({ type: "single", ex });
  });
  return blocks;
}

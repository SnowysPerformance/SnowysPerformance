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

// ---------- VBT (velocity-based training / bar speed) ----------
// A coach prescribes a bar-speed zone in m/s on a planned exercise:
// goalBarSpeed = low end, goalBarSpeedMax = high end (either may be blank
// for an open-ended "at least" / "at most" target), plus an optional
// velocityLossPct cutoff ("stop when speed drops X% from your fastest").
// Logged workouts carry a snapshot as vbtMin / vbtMax / vbtLossPct, and
// each set's measured speed as set.velocity.
export type VbtZone = { min: number | null; max: number | null; lossPct: number | null };

const posNum = (v: any): number | null => {
  const n = Number(v);
  return v !== null && v !== undefined && v !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

export function vbtFromExercise(ex: any): VbtZone | null {
  const z = { min: posNum(ex?.goalBarSpeed), max: posNum(ex?.goalBarSpeedMax), lossPct: posNum(ex?.velocityLossPct) };
  return z.min || z.max ? z : null;
}
export function vbtFromLog(log: any): VbtZone | null {
  const z = { min: posNum(log?.vbtMin), max: posNum(log?.vbtMax), lossPct: posNum(log?.vbtLossPct) };
  return z.min || z.max ? z : null;
}

const fmtV = (n: number) => n.toFixed(2);

// "0.75–1.00 m/s", "≥ 0.75 m/s" or "≤ 1.00 m/s"
export function vbtZoneLabel(z: VbtZone | null): string {
  if (!z) return "";
  if (z.min && z.max) return `${fmtV(z.min)}–${fmtV(z.max)} m/s`;
  if (z.min) return `≥ ${fmtV(z.min)} m/s`;
  return `≤ ${fmtV(z.max!)} m/s`;
}
// Full prescription line, e.g. "VBT 0.75–1.00 m/s · stop at 20% drop"
export function vbtLabel(z: VbtZone | null): string {
  if (!z) return "";
  return `VBT ${vbtZoneLabel(z)}${z.lossPct ? ` · stop at ${z.lossPct}% drop` : ""}`;
}

// Where one measured speed sits relative to the zone.
export function velocityStatus(v: number, z: VbtZone | null): "in" | "slow" | "fast" | null {
  if (!z || !(v > 0)) return null;
  if (z.min && v < z.min) return "slow";
  if (z.max && v > z.max) return "fast";
  return "in";
}

// Speed drop of each set vs. the fastest set so far (set-to-set velocity
// loss), as a whole-number percent. null for sets with no speed logged.
export function velocityDrops(velocities: Array<number | null>): Array<number | null> {
  let fastest = 0;
  return velocities.map((v) => {
    if (!v || !(v > 0)) return null;
    if (v > fastest) fastest = v;
    return Math.round(((fastest - v) / fastest) * 100);
  });
}

// Average of the sets that have a speed logged (m/s), or null.
export function avgVelocity(sets: any[]): number | null {
  const vs = (sets || []).map((s: any) => Number(s?.velocity)).filter((v) => v > 0);
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
}

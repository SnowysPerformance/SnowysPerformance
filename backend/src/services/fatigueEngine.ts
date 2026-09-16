import { prisma } from "../db";

export interface FatigueResult {
  athleteId: string;
  acuteLoad: number;
  chronicLoad: number;
  acwr: number | null;
  recoveryAvg7d: number | null;
  flag: "INSUFFICIENT_DATA" | "UNDERTRAINING" | "OPTIMAL" | "ELEVATED_RISK" | "HIGH_RISK";
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A transparent, evidence-based heuristic rather than a black-box model:
 * Acute:Chronic Workload Ratio (ACWR) — the 7-day training load compared
 * against the athlete's 4-week average weekly load — is a well-studied
 * proxy for injury/overtraining risk in the sports-science literature
 * (see Gabbett, 2016, "The training-injury prevention paradox").
 *
 * Wearable recovery (from WHOOP/HealthKit/Garmin, when connected) refines
 * the flag: a rising ACWR paired with poor recovery is a stronger signal
 * than either alone.
 *
 * This is intentionally simple and inspectable so a coach can trust *why*
 * a flag fired. Swap in a trained model later by replacing the body of
 * this function — the API contract (FatigueResult) can stay the same.
 */
export async function computeFatigue(athleteId: string, teamId: string): Promise<FatigueResult> {
  const now = new Date();
  const since28 = new Date(now.getTime() - 28 * DAY_MS);

  const logs = await prisma.workoutLog.findMany({
    where: { athleteId, teamId, date: { gte: since28 } },
    select: { date: true, volumeLoad: true },
  });

  if (logs.length === 0) {
    return {
      athleteId,
      acuteLoad: 0,
      chronicLoad: 0,
      acwr: null,
      recoveryAvg7d: null,
      flag: "INSUFFICIENT_DATA",
      message: "Not enough logged training data in the last 28 days to compute a fatigue score.",
    };
  }

  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const acuteLoad = logs.filter((l) => l.date >= since7).reduce((s, l) => s + l.volumeLoad, 0);
  const totalLoad28 = logs.reduce((s, l) => s + l.volumeLoad, 0);
  const chronicLoad = totalLoad28 / 4; // average *weekly* load over 4 weeks, comparable to acuteLoad

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : null;

  const wearable = await prisma.wearableData.findMany({
    where: { athleteId, teamId, date: { gte: since7 } },
    select: { recovery: true },
  });
  const recoveryValues = wearable.map((w) => w.recovery).filter((v): v is number => v !== null && v !== undefined);
  const recoveryAvg7d = recoveryValues.length
    ? recoveryValues.reduce((s, v) => s + v, 0) / recoveryValues.length
    : null;

  let flag: FatigueResult["flag"] = "OPTIMAL";
  let message = "Training load looks balanced.";

  if (acwr !== null) {
    if (acwr > 1.5) {
      flag = "HIGH_RISK";
      message =
        "Acute load is more than 1.5x the chronic average — the range associated with elevated injury/overtraining risk. Consider a deload.";
    } else if (acwr > 1.3) {
      flag = "ELEVATED_RISK";
      message = "Acute load is trending well above the chronic average. Monitor closely and consider easing volume this week.";
    } else if (acwr < 0.8) {
      flag = "UNDERTRAINING";
      message = "Recent load is well below the athlete's chronic average — likely detraining or a planned taper.";
    }
  }

  if (recoveryAvg7d !== null && recoveryAvg7d < 33 && acwr !== null && acwr > 1.2) {
    flag = "HIGH_RISK";
    message = "Low wearable recovery combined with rising training load — a strong overtraining signal. Recommend a recovery day.";
  }

  return {
    athleteId,
    acuteLoad: Math.round(acuteLoad),
    chronicLoad: Math.round(chronicLoad),
    acwr: acwr !== null ? Math.round(acwr * 100) / 100 : null,
    recoveryAvg7d: recoveryAvg7d !== null ? Math.round(recoveryAvg7d) : null,
    flag,
    message,
  };
}

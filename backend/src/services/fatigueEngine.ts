import { prisma } from "../db";

export interface FatigueResult {
  athleteId: string;
  acuteLoad: number;
  chronicLoad: number;
  acwr: number | null;
  recoveryAvg7d: number | null;
  recoveryTrend: "IMPROVING" | "DECLINING" | "STABLE" | null;
  sleepAvg7d: number | null;
  sleepTrend: "IMPROVING" | "DECLINING" | "STABLE" | null;
  recoveryBaseline: number | null;
  sleepBaseline: number | null;
  flag: "INSUFFICIENT_DATA" | "UNDERTRAINING" | "OPTIMAL" | "ELEVATED_RISK" | "HIGH_RISK";
  message: string;
  deloadRecommended: boolean;
  deloadReason: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A transparent, evidence-based heuristic rather than a black-box model:
 * Acute:Chronic Workload Ratio (ACWR) — the 7-day training load compared
 * against the athlete's 4-week average weekly load — is a well-studied
 * proxy for injury/overtraining risk in the sports-science literature
 * (see Gabbett, 2016, "The training-injury prevention paradox").
 *
 * Wearable recovery and sleep (from WHOOP/HealthKit/Garmin, when connected)
 * refine the flag: a rising ACWR paired with poor or *declining* recovery
 * or sleep is a stronger signal than any one of these alone — a downward
 * trend in either over the past week is often the earliest warning sign,
 * before ACWR itself looks bad. Poor sleep in particular is one of the
 * best-supported early predictors of accumulating fatigue and injury risk
 * in the sports-science literature, independent of recovery score.
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
      recoveryTrend: null,
      sleepAvg7d: null,
      sleepTrend: null,
      recoveryBaseline: null,
      sleepBaseline: null,
      flag: "INSUFFICIENT_DATA",
      message: "Not enough logged training data in the last 28 days to compute a fatigue score.",
      deloadRecommended: false,
      deloadReason: null,
    };
  }

  // ACWR is only meaningful once there's an actual multi-week baseline to
  // compare against. Without this, a single early workout looks like a
  // massive spike against almost no chronic history (e.g. one workout
  // divided by "4 weeks" of data that's really only a few days old) and
  // wrongly fires a HIGH_RISK/deload flag right out of the gate.
  const earliestLogMs = Math.min(...logs.map((l) => l.date.getTime()));
  const daysOfHistory = (now.getTime() - earliestLogMs) / DAY_MS;
  const MIN_HISTORY_DAYS = 14;

  if (daysOfHistory < MIN_HISTORY_DAYS) {
    const acuteLoadSoFar = logs.reduce((s, l) => s + l.volumeLoad, 0);
    return {
      athleteId,
      acuteLoad: Math.round(acuteLoadSoFar),
      chronicLoad: 0,
      acwr: null,
      recoveryAvg7d: null,
      recoveryTrend: null,
      sleepAvg7d: null,
      sleepTrend: null,
      recoveryBaseline: null,
      sleepBaseline: null,
      flag: "INSUFFICIENT_DATA",
      message: `Still building a training history (${Math.max(1, Math.round(daysOfHistory))} of ${MIN_HISTORY_DAYS} days) before a fatigue trend can be calculated reliably.`,
      deloadRecommended: false,
      deloadReason: null,
    };
  }

  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const acuteLoad = logs.filter((l) => l.date >= since7).reduce((s, l) => s + l.volumeLoad, 0);
  const totalLoad28 = logs.reduce((s, l) => s + l.volumeLoad, 0);
  // Average *weekly* load, but over however many weeks of real history exist
  // (capped at the usual 4-week chronic window) rather than always dividing
  // by 4 — otherwise early weeks look artificially spiky.
  const weeksOfData = Math.min(4, daysOfHistory / 7);
  const chronicLoad = totalLoad28 / weeksOfData;

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : null;

  // Recovery and sleep: look back 14 days so we can compare "this week" vs
  // "last week" and catch a downward trend even before the 7-day average
  // itself looks low — that's the earliest warning sign a deload may be
  // needed soon.
  const since14 = new Date(now.getTime() - 14 * DAY_MS);
  const wearable14 = await prisma.wearableData.findMany({
    where: { athleteId, teamId, date: { gte: since14 } },
    select: { date: true, recovery: true, sleepScore: true },
  });

  function weeklyAvgAndTrend(field: "recovery" | "sleepScore") {
    const thisWeek = wearable14
      .filter((w) => w.date >= since7)
      .map((w) => w[field])
      .filter((v): v is number => v !== null && v !== undefined);
    const lastWeek = wearable14
      .filter((w) => w.date < since7)
      .map((w) => w[field])
      .filter((v): v is number => v !== null && v !== undefined);

    const avg7d = thisWeek.length ? thisWeek.reduce((s, v) => s + v, 0) / thisWeek.length : null;
    const avgPrior7d = lastWeek.length ? lastWeek.reduce((s, v) => s + v, 0) / lastWeek.length : null;

    let trend: FatigueResult["recoveryTrend"] = null;
    if (avg7d !== null && avgPrior7d !== null) {
      const delta = avg7d - avgPrior7d;
      // A ~5-point swing in a WHOOP-style 0-100 score is generally
      // considered a meaningful change rather than day-to-day noise.
      if (delta <= -5) trend = "DECLINING";
      else if (delta >= 5) trend = "IMPROVING";
      else trend = "STABLE";
    }
    return { avg7d, trend };
  }

  const { avg7d: recoveryAvg7d, trend: recoveryTrend } = weeklyAvgAndTrend("recovery");
  const { avg7d: sleepAvg7d, trend: sleepTrend } = weeklyAvgAndTrend("sleepScore");

  // Personal baseline: what's actually "normal" for THIS athlete, learned
  // from their own history rather than a one-size-fits-all cutoff. Looks at
  // up to 8 weeks of their wearable data, excluding the current week (so the
  // baseline reflects their established norm, not the week we're judging
  // against it). Requires at least 10 days of prior data so a brand-new
  // athlete doesn't get a baseline built from noise. This recalculates from
  // live data on every request, so it keeps adapting as more of an
  // athlete's history accumulates — no manual retraining needed.
  const since56 = new Date(now.getTime() - 56 * DAY_MS);
  const wearableBaselineWindow = await prisma.wearableData.findMany({
    where: { athleteId, teamId, date: { gte: since56, lt: since7 } },
    select: { recovery: true, sleepScore: true },
  });
  const MIN_BASELINE_DAYS = 10;

  function personalBaseline(field: "recovery" | "sleepScore") {
    const vals = wearableBaselineWindow
      .map((w) => w[field])
      .filter((v): v is number => v !== null && v !== undefined);
    if (vals.length < MIN_BASELINE_DAYS) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }

  const recoveryBaseline = personalBaseline("recovery");
  const sleepBaseline = personalBaseline("sleepScore");

  // A ~10-point gap below an athlete's own personal average is treated as a
  // meaningful personal deviation — this can catch an athlete whose recovery
  // or sleep is unusually low *for them* even when it's not low enough to
  // trip the fixed population-level thresholds below.
  const recoveryBelowPersonalBaseline =
    recoveryAvg7d !== null && recoveryBaseline !== null && recoveryBaseline - recoveryAvg7d >= 10;
  const sleepBelowPersonalBaseline =
    sleepAvg7d !== null && sleepBaseline !== null && sleepBaseline - sleepAvg7d >= 10;

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
    } else if (acwr > 1.1 && (recoveryBelowPersonalBaseline || sleepBelowPersonalBaseline)) {
      // Load isn't spiking by generic standards, but it's rising while this
      // specific athlete is running well below their own normal recovery or
      // sleep — a personalized early warning a fixed threshold would miss.
      flag = "ELEVATED_RISK";
      message = recoveryBelowPersonalBaseline
        ? "Training load is rising and recovery is well below this athlete's own personal average, even though it isn't unusually low by general standards. Worth keeping an eye on."
        : "Training load is rising and sleep is well below this athlete's own personal average, even though it isn't unusually low by general standards. Worth keeping an eye on.";
    }
  }

  if (recoveryAvg7d !== null && recoveryAvg7d < 33 && acwr !== null && acwr > 1.2) {
    flag = "HIGH_RISK";
    message = "Low wearable recovery combined with rising training load — a strong overtraining signal. Recommend a recovery day.";
  } else if (sleepAvg7d !== null && sleepAvg7d < 60 && acwr !== null && acwr > 1.2) {
    flag = "HIGH_RISK";
    message = "Poor sleep combined with rising training load — a strong overtraining signal. Recommend a recovery day.";
  }

  // Deload recommendation: a clearer, coach-facing call than the raw flag
  // above. It fires on the same evidence, but requires *corroborating*
  // signals (not just one borderline number) before telling a coach to
  // actually back off an athlete's programming.
  let deloadRecommended = false;
  let deloadReason: string | null = null;

  if (flag === "HIGH_RISK") {
    deloadRecommended = true;
    if (recoveryAvg7d !== null && recoveryAvg7d < 33) {
      deloadReason = "Training load is well above normal and wearable recovery is low — the combination most associated with overtraining.";
    } else if (sleepAvg7d !== null && sleepAvg7d < 60) {
      deloadReason = "Training load is well above normal and sleep has been poor this week — a combination linked to overtraining.";
    } else {
      deloadReason = "Training load is more than 1.5x this athlete's usual — a level linked to elevated injury risk in the sports-science literature.";
    }
  } else if (flag === "ELEVATED_RISK" && recoveryTrend === "DECLINING") {
    deloadRecommended = true;
    deloadReason = "Training load is trending up while recovery has been dropping over the past week — worth easing off before it compounds.";
  } else if (flag === "ELEVATED_RISK" && sleepTrend === "DECLINING") {
    deloadRecommended = true;
    deloadReason = "Training load is trending up while sleep has been getting worse over the past week — worth easing off before it compounds.";
  } else if (acwr !== null && acwr > 1.15 && recoveryTrend === "DECLINING" && recoveryAvg7d !== null && recoveryAvg7d < 45) {
    deloadRecommended = true;
    deloadReason = "Recovery has been declining for a week and is now on the low side, even though load hasn't spiked dramatically yet.";
  } else if (acwr !== null && acwr > 1.15 && sleepTrend === "DECLINING" && sleepAvg7d !== null && sleepAvg7d < 65) {
    deloadRecommended = true;
    deloadReason = "Sleep has been declining for a week and is now on the low side, even though load hasn't spiked dramatically yet.";
  } else if (acwr !== null && acwr > 1.1 && recoveryBelowPersonalBaseline) {
    deloadRecommended = true;
    deloadReason = "Recovery is running well below this athlete's own personal average while training load is elevated — a personalized early-warning sign the general thresholds alone would miss.";
  } else if (acwr !== null && acwr > 1.1 && sleepBelowPersonalBaseline) {
    deloadRecommended = true;
    deloadReason = "Sleep is running well below this athlete's own personal average while training load is elevated — a personalized early-warning sign the general thresholds alone would miss.";
  }

  return {
    athleteId,
    acuteLoad: Math.round(acuteLoad),
    chronicLoad: Math.round(chronicLoad),
    acwr: acwr !== null ? Math.round(acwr * 100) / 100 : null,
    recoveryAvg7d: recoveryAvg7d !== null ? Math.round(recoveryAvg7d) : null,
    recoveryTrend,
    sleepAvg7d: sleepAvg7d !== null ? Math.round(sleepAvg7d) : null,
    sleepTrend,
    recoveryBaseline: recoveryBaseline !== null ? Math.round(recoveryBaseline) : null,
    sleepBaseline: sleepBaseline !== null ? Math.round(sleepBaseline) : null,
    flag,
    message,
    deloadRecommended,
    deloadReason,
  };
}

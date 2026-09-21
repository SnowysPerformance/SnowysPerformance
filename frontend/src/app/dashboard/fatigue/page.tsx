"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const FLAG_STYLES: Record<string, string> = {
  HIGH_RISK: "bg-red-950/40 text-red-300 border-red-800/50",
  ELEVATED_RISK: "bg-amber-950/40 text-amber-300 border-amber-800/50",
  OPTIMAL: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
  UNDERTRAINING: "bg-sky-950/40 text-sky-300 border-sky-800/50",
  INSUFFICIENT_DATA: "bg-raised text-faint border-edge",
};

const PROGRESS_STYLES: Record<string, string> = {
  IMPROVING: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
  BUILDING: "bg-sky-950/40 text-sky-300 border-sky-800/50",
  PLATEAUING: "bg-amber-950/40 text-amber-300 border-amber-800/50",
  DECLINING: "bg-red-950/40 text-red-300 border-red-800/50",
  INSUFFICIENT_DATA: "bg-raised text-faint border-edge",
};

const PROGRESS_LABEL: Record<string, string> = {
  IMPROVING: "Improving",
  BUILDING: "Building Volume",
  PLATEAUING: "Plateauing",
  DECLINING: "Declining",
  INSUFFICIENT_DATA: "Not Enough Data",
};

const RECOVERY_TREND_LABEL: Record<string, string> = {
  IMPROVING: "↑ Recovery improving",
  DECLINING: "↓ Recovery declining",
  STABLE: "→ Recovery stable",
};

const SLEEP_TREND_LABEL: Record<string, string> = {
  IMPROVING: "↑ Sleep improving",
  DECLINING: "↓ Sleep declining",
  STABLE: "→ Sleep stable",
};

// Fatigue/overtraining risk and progress trend are coaching tools — coaches
// use this to spot athletes who need a deload or a programming change,
// athletes don't see a risk flag on themselves. (Athletes track their own
// training on the Progress page instead.) Everything here is recalculated
// fresh from each athlete's latest training logs and wearable data on every
// page load — nothing is cached or precomputed.
export default function FatiguePage() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "COACH") return;
    setLoading(true);
    api("/api/fatigue/team")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (user && user.role !== "COACH") {
    return (
      <div>
        <h1 className="font-display text-xl font-semibold mb-4">Team Fatigue</h1>
        <p className="text-sm text-faint">This page is for coaches. Head to your Progress page to see your own charts and recovery trends.</p>
      </div>
    );
  }

  const deloadCount = data.filter((d) => d.deloadRecommended).length;

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-2">Team Fatigue & Deload Insights</h1>
      <p className="text-sm text-faint mb-4">
        Based on Acute:Chronic Workload Ratio (7-day load vs. up-to-4-week average), wearable recovery and sleep trends, each
        athlete's own personal baselines, and recent PR/volume trends — recalculated live from each athlete's latest data.
      </p>

      {!loading && data.length > 0 && (
        <div
          className={`rounded p-3 mb-4 text-sm font-medium border ${
            deloadCount > 0 ? "bg-red-950/30 text-red-300 border-red-800/40" : "bg-emerald-950/30 text-emerald-300 border-emerald-800/40"
          }`}
        >
          {deloadCount > 0
            ? `${deloadCount} athlete${deloadCount > 1 ? "s" : ""} may need a deload right now.`
            : "No athletes are currently flagged for a deload."}
        </div>
      )}

      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.athleteId} className="bg-surface border border-edge rounded p-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="font-medium">{d.athleteName || d.athleteId}</span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {d.deloadRecommended && (
                  <span className="text-xs font-semibold rounded px-2 py-1 border bg-red-950/50 text-red-300 border-red-700">
                    Deload Recommended
                  </span>
                )}
                <span className={`text-xs font-semibold rounded px-2 py-1 border ${FLAG_STYLES[d.flag]}`}>{d.flag.replace("_", " ")}</span>
                {d.progress && (
                  <span className={`text-xs font-semibold rounded px-2 py-1 border ${PROGRESS_STYLES[d.progress.trend]}`}>
                    {PROGRESS_LABEL[d.progress.trend]}
                  </span>
                )}
              </div>
            </div>

            <div className="text-sm text-faint mt-2">
              ACWR: {d.acwr ?? "—"} · Acute load: {d.acuteLoad} · Chronic (wk avg): {d.chronicLoad}
            </div>

            <div className="text-sm text-faint mt-1">
              Recovery avg: {d.recoveryAvg7d ?? "—"}%
              {d.recoveryBaseline != null && <span className="text-xs text-muted"> (usual ~{d.recoveryBaseline}%)</span>}
              {d.recoveryTrend && <span className="ml-2">{RECOVERY_TREND_LABEL[d.recoveryTrend]}</span>}
              <span className="mx-2">·</span>
              Sleep avg: {d.sleepAvg7d ?? "—"}%
              {d.sleepBaseline != null && <span className="text-xs text-muted"> (usual ~{d.sleepBaseline}%)</span>}
              {d.sleepTrend && <span className="ml-2">{SLEEP_TREND_LABEL[d.sleepTrend]}</span>}
            </div>

            {d.deloadRecommended && d.deloadReason && (
              <div className="text-sm mt-2 text-red-300 font-medium">Why: {d.deloadReason}</div>
            )}
            <div className="text-sm mt-2 text-muted">{d.message}</div>

            {d.progress && d.progress.trend !== "INSUFFICIENT_DATA" && (
              <div className="text-sm mt-2 text-muted border-t border-edgesoft pt-2">
                <span className="text-faint">Progress: </span>
                {d.progress.message}
              </div>
            )}
          </div>
        ))}
        {!loading && data.length === 0 && <p className="text-faint text-sm">No fatigue data yet.</p>}
      </div>
    </div>
  );
}

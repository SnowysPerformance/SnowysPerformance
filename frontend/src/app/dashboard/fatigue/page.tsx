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

// Fatigue/overtraining risk is a coaching tool — coaches use it to spot
// athletes who need a deload, athletes don't see a risk flag on themselves.
// (Athletes track their own training on the Progress page instead.)
export default function FatiguePage() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== "COACH") return;
    api("/api/fatigue/team").then(setData).catch(console.error);
  }, [user]);

  if (user && user.role !== "COACH") {
    return (
      <div>
        <h1 className="font-display text-xl font-semibold mb-4">Team Fatigue</h1>
        <p className="text-sm text-faint">This page is for coaches. Head to your Progress page to see your own charts and recovery trends.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4">Team Fatigue & Overtraining Risk</h1>
      <p className="text-sm text-faint mb-4">Based on Acute:Chronic Workload Ratio (7-day load vs. up-to-4-week average) plus wearable recovery, where available.</p>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.athleteId} className="bg-surface border border-edge rounded p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">{d.athleteId}</span>
              <span className={`text-xs font-semibold rounded px-2 py-1 border ${FLAG_STYLES[d.flag]}`}>{d.flag.replace("_", " ")}</span>
            </div>
            <div className="text-sm text-faint mt-2">
              ACWR: {d.acwr ?? "—"} · Acute load: {d.acuteLoad} · Chronic (wk avg): {d.chronicLoad} · Recovery avg: {d.recoveryAvg7d ?? "—"}%
            </div>
            <div className="text-sm mt-2 text-muted">{d.message}</div>
          </div>
        ))}
        {data.length === 0 && <p className="text-faint text-sm">No fatigue data yet.</p>}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const FLAG_COLORS: Record<string, string> = {
  HIGH_RISK: "bg-red-100 text-red-700",
  ELEVATED_RISK: "bg-amber-100 text-amber-700",
  OPTIMAL: "bg-emerald-100 text-emerald-700",
  UNDERTRAINING: "bg-blue-100 text-blue-700",
  INSUFFICIENT_DATA: "bg-slate-100 text-slate-500",
};

export default function FatiguePage() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    if (user.role === "COACH") {
      api("/api/fatigue/team").then(setData).catch(console.error);
    } else {
      api(`/api/fatigue/${user.id}`).then((d) => setData([d])).catch(console.error);
    }
  }, [user]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Fatigue & Overtraining Risk</h1>
      <p className="text-sm text-slate-500 mb-4">
        Based on Acute:Chronic Workload Ratio (7-day load vs. 4-week average) plus wearable recovery, where available.
      </p>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.athleteId} className="bg-white border rounded p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">{d.athleteId === user?.id ? "You" : d.athleteId}</span>
              <span className={`text-xs font-semibold rounded px-2 py-1 ${FLAG_COLORS[d.flag]}`}>{d.flag.replace("_", " ")}</span>
            </div>
            <div className="text-sm text-slate-500 mt-2">
              ACWR: {d.acwr ?? "—"} · Acute load: {d.acuteLoad} · Chronic (wk avg): {d.chronicLoad} · Recovery avg: {d.recoveryAvg7d ?? "—"}%
            </div>
            <div className="text-sm mt-2">{d.message}</div>
          </div>
        ))}
        {data.length === 0 && <p className="text-slate-500">No fatigue data yet.</p>}
      </div>
    </div>
  );
}

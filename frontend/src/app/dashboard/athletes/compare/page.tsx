"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

const FLAG_STYLES: Record<string, string> = {
  HIGH_RISK: "bg-red-950/40 text-red-300 border-red-800/50",
  ELEVATED_RISK: "bg-amber-950/40 text-amber-300 border-amber-800/50",
  OPTIMAL: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
  UNDERTRAINING: "bg-sky-950/40 text-sky-300 border-sky-800/50",
  INSUFFICIENT_DATA: "bg-raised text-faint border-edge",
};

export default function CompareAthletesPage() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const athletes = await api("/api/teams/me/athletes");
      const results = await Promise.all(
        ids.map(async (id) => {
          const info = athletes.find((a: any) => a.id === id);
          const [logs, fatigue] = await Promise.all([api(`/api/workouts?athleteId=${id}`), api(`/api/fatigue/${id}`)]);
          const byDate: Record<string, number> = {};
          logs.forEach((l: any) => {
            const d = new Date(l.date).toLocaleDateString();
            byDate[d] = (byDate[d] || 0) + l.volumeLoad;
          });
          const chartData = Object.entries(byDate)
            .map(([date, volume]) => ({ date, volume }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-10);
          return { id, info, logs, fatigue, chartData };
        })
      );
      setProfiles(results);
    })();
  }, [ids.join(",")]);

  return (
    <div>
      <Link href="/dashboard/athletes" className="text-xs text-faint underline hover:text-muted">
        ← All athletes
      </Link>
      <h1 className="font-display text-2xl font-semibold mt-2 mb-6">Comparing {ids.length} Athletes</h1>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(profiles.length || 1, 3)}, minmax(260px, 1fr))` }}>
        {profiles.map((p) => (
          <div key={p.id} className="bg-surface border border-edge rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Link href={`/dashboard/athletes/${p.id}`} className="font-display font-semibold text-accent underline">
                {p.info?.name || "…"}
              </Link>
            </div>
            {p.fatigue && (
              <div className="mb-3">
                <span className={`text-xs font-semibold rounded px-2 py-1 border ${FLAG_STYLES[p.fatigue.flag]}`}>{p.fatigue.flag.replace("_", " ")}</span>
                <div className="text-xs text-faint mt-2">
                  ACWR: {p.fatigue.acwr ?? "—"} · Recovery: {p.fatigue.recoveryAvg7d ?? "—"}%
                </div>
              </div>
            )}
            {p.chartData?.length > 0 ? (
              <div className="bg-void border border-edgesoft rounded p-1 mb-3">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={p.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#292D38" vertical={false} />
                    <XAxis dataKey="date" stroke="#5B5F6E" fontSize={9} tickLine={false} axisLine={{ stroke: "#333744" }} />
                    <YAxis stroke="#5B5F6E" fontSize={9} tickLine={false} axisLine={false} width={35} />
                    <Tooltip contentStyle={{ background: "#191C23", border: "1px solid #333744", borderRadius: 5, fontSize: 11 }} labelStyle={{ color: "#8F94A3" }} />
                    <Line type="monotone" dataKey="volume" stroke="#7EC8E3" strokeWidth={2} dot={{ r: 2, fill: "#7EC8E3" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-faint text-xs mb-3">No workouts logged yet.</p>
            )}
            <div className="text-xs text-faint">{p.logs?.length || 0} total sessions logged</div>
            <Link href={`/dashboard/athletes/${p.id}`} className="block text-center text-xs bg-accent text-accenttext font-semibold rounded px-2 py-1.5 mt-3">
              Open full workspace
            </Link>
          </div>
        ))}
      </div>
      {profiles.length === 0 && <p className="text-faint text-sm">Select athletes from the roster to compare them here.</p>}
    </div>
  );
}

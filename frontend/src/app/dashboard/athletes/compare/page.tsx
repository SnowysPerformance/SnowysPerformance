"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { METHOD_PALETTE } from "@/lib/prs";

const FLAG_STYLES: Record<string, string> = {
  HIGH_RISK: "bg-red-950/40 text-red-300 border-red-800/50",
  ELEVATED_RISK: "bg-amber-950/40 text-amber-300 border-amber-800/50",
  OPTIMAL: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
  UNDERTRAINING: "bg-sky-950/40 text-sky-300 border-sky-800/50",
  INSUFFICIENT_DATA: "bg-raised text-faint border-edge",
};

// useSearchParams() requires a <Suspense> boundary around it (Next.js
// build-time requirement), so the default export just supplies that and the
// real page lives in CompareAthletesPageInner.
export default function CompareAthletesPage() {
  return (
    <Suspense fallback={<p className="text-faint text-sm">Loading…</p>}>
      <CompareAthletesPageInner />
    </Suspense>
  );
}

function CompareAthletesPageInner() {
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
          return { id, info, logs, fatigue };
        })
      );
      setProfiles(results);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  // One shared chart: merge every athlete's daily volume onto the same set of
  // date rows, so their lines sit on one grid instead of separate mini-charts.
  const mergedChartData = useMemo(() => {
    const byDate: Record<string, { date: string; sortKey: number; [athleteId: string]: any }> = {};
    profiles.forEach((p) => {
      const perDate: Record<string, number> = {};
      (p.logs || []).forEach((l: any) => {
        const d = new Date(l.date).toLocaleDateString();
        perDate[d] = (perDate[d] || 0) + l.volumeLoad;
      });
      Object.entries(perDate).forEach(([date, volume]) => {
        if (!byDate[date]) byDate[date] = { date, sortKey: new Date(date).getTime() };
        byDate[date][p.id] = volume;
      });
    });
    return Object.values(byDate).sort((a, b) => a.sortKey - b.sortKey);
  }, [profiles]);

  const athleteColor = (index: number) => METHOD_PALETTE[index % METHOD_PALETTE.length];

  return (
    <div>
      <Link href="/dashboard/athletes" className="text-xs text-faint underline hover:text-muted">
        ← All athletes
      </Link>
      <h1 className="font-display text-2xl font-semibold mt-2 mb-6">Comparing {ids.length} Athletes</h1>

      {profiles.length === 0 && <p className="text-faint text-sm">Select athletes from the roster to compare them here.</p>}

      {profiles.length > 0 && (
        <div className="bg-surface border border-edge rounded-lg p-4 mb-6">
          <div className="font-display text-sm uppercase tracking-wide text-muted mb-3">Training Volume — All Selected Athletes, Same Grid</div>
          {mergedChartData.length === 0 ? (
            <p className="text-faint text-sm">No workouts logged for these athletes yet.</p>
          ) : (
            <div className="bg-void border border-edgesoft rounded p-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mergedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292D38" vertical={false} />
                  <XAxis dataKey="date" stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={{ stroke: "#333744" }} />
                  <YAxis stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={{ background: "#191C23", border: "1px solid #333744", borderRadius: 5, fontSize: 12 }} labelStyle={{ color: "#8F94A3" }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#8F94A3" }} />
                  {profiles.map((p, i) => (
                    <Line
                      key={p.id}
                      type="monotone"
                      dataKey={p.id}
                      name={p.info?.name || "…"}
                      stroke={athleteColor(i)}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: athleteColor(i) }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(profiles.length || 1, 3)}, minmax(240px, 1fr))` }}>
        {profiles.map((p, i) => (
          <div key={p.id} className="bg-surface border border-edge rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Link href={`/dashboard/athletes/${p.id}`} className="font-display font-semibold underline" style={{ color: athleteColor(i) }}>
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
            <div className="text-xs text-faint">{p.logs?.length || 0} total sessions logged</div>
            <Link href={`/dashboard/athletes/${p.id}`} className="block text-center text-xs bg-accent text-accenttext font-semibold rounded px-2 py-1.5 mt-3">
              Open full workspace
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

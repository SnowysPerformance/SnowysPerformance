"use client";
import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

const FLAG_STYLES: Record<string, string> = {
  HIGH_RISK: "bg-red-950/40 text-red-300 border-red-800/50",
  ELEVATED_RISK: "bg-amber-950/40 text-amber-300 border-amber-800/50",
  OPTIMAL: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
  UNDERTRAINING: "bg-sky-950/40 text-sky-300 border-sky-800/50",
  INSUFFICIENT_DATA: "bg-raised text-faint border-edge",
};

const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));
const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none";

export default function AthleteProgressTab({ params }: { params: { id: string } }) {
  const athleteId = params.id;
  const [logs, setLogs] = useState<any[]>([]);
  const [fatigue, setFatigue] = useState<any>(null);

  const [customExercise, setCustomExercise] = useState("");
  const [customMetric, setCustomMetric] = useState<"volume" | "topWeight" | "e1rm">("e1rm");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    (async () => {
      const [workoutLogs, fatigueData] = await Promise.all([api(`/api/workouts?athleteId=${athleteId}`), api(`/api/fatigue/${athleteId}`)]);
      setLogs(workoutLogs);
      setFatigue(fatigueData);
    })();
  }, [athleteId]);

  const byDate: Record<string, number> = {};
  logs.forEach((l) => {
    const d = new Date(l.date).toLocaleDateString();
    byDate[d] = (byDate[d] || 0) + l.volumeLoad;
  });
  const overallChartData = Object.entries(byDate)
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const exerciseNames = useMemo(() => {
    const names = new Set(logs.filter((l) => l.type === "weighted" || !l.type).map((l) => l.exerciseName));
    return Array.from(names).sort();
  }, [logs]);

  const customChartData = useMemo(() => {
    if (!customExercise) return [];
    return logs
      .filter((l) => l.exerciseName === customExercise && (l.type === "weighted" || !l.type))
      .filter((l) => (!fromDate || new Date(l.date) >= new Date(fromDate)) && (!toDate || new Date(l.date) <= new Date(toDate)))
      .map((l) => {
        const valid = (l.sets || []).filter((s: any) => s.weight > 0 && s.reps > 0);
        let value = 0;
        if (customMetric === "volume") value = l.volumeLoad;
        else if (customMetric === "topWeight") value = valid.length ? Math.max(...valid.map((s: any) => s.weight)) : 0;
        else value = valid.length ? Math.max(...valid.map((s: any) => Math.round(e1rm(s.weight, s.reps)))) : 0;
        return { date: new Date(l.date).toLocaleDateString(), value };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [logs, customExercise, customMetric, fromDate, toDate]);

  const metricLabel = customMetric === "volume" ? "Volume (lb·reps)" : customMetric === "topWeight" ? "Top Weight (lb)" : "Est. 1RM (lb)";

  return (
    <div className="space-y-6">
      {fatigue && (
        <div className="bg-surface border border-edge rounded p-4">
          <div className="flex justify-between items-center">
            <span className="font-display text-sm uppercase tracking-wide text-muted">Fatigue & Overtraining Risk</span>
            <span className={`text-xs font-semibold rounded px-2 py-1 border ${FLAG_STYLES[fatigue.flag]}`}>{fatigue.flag.replace("_", " ")}</span>
          </div>
          <div className="text-sm text-faint mt-2">
            ACWR: {fatigue.acwr ?? "—"} · Acute load: {fatigue.acuteLoad} · Chronic (wk avg): {fatigue.chronicLoad} · Recovery avg: {fatigue.recoveryAvg7d ?? "—"}%
          </div>
          <div className="text-sm mt-2 text-muted">{fatigue.message}</div>
        </div>
      )}

      <div className="bg-surface border border-edge rounded p-4">
        <div className="font-display text-sm uppercase tracking-wide text-muted mb-3">Training Volume Over Time (All Exercises)</div>
        {overallChartData.length === 0 ? (
          <p className="text-faint text-sm">No workouts logged yet.</p>
        ) : (
          <div className="bg-void border border-edgesoft rounded p-2">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={overallChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292D38" vertical={false} />
                <XAxis dataKey="date" stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={{ stroke: "#333744" }} />
                <YAxis stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={{ background: "#191C23", border: "1px solid #333744", borderRadius: 5, fontSize: 12 }} labelStyle={{ color: "#8F94A3" }} />
                <Line type="monotone" dataKey="volume" name="Volume (lb·reps)" stroke="#7EC8E3" strokeWidth={2.5} dot={{ r: 3, fill: "#7EC8E3" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-surface border border-edge rounded p-4">
        <div className="font-display text-sm uppercase tracking-wide text-muted mb-3">Custom Graph</div>
        <div className="flex flex-wrap gap-2 mb-3">
          <select className={inputClass} value={customExercise} onChange={(e) => setCustomExercise(e.target.value)}>
            <option value="">Choose an exercise…</option>
            {exerciseNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select className={inputClass} value={customMetric} onChange={(e) => setCustomMetric(e.target.value as any)}>
            <option value="e1rm">Estimated 1RM</option>
            <option value="topWeight">Top Weight</option>
            <option value="volume">Volume Load</option>
          </select>
          <input type="date" className={inputClass} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span className="text-xs text-faint self-center">to</span>
          <input type="date" className={inputClass} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        {!customExercise ? (
          <p className="text-faint text-sm">Pick an exercise above to see its trend.</p>
        ) : customChartData.length === 0 ? (
          <p className="text-faint text-sm">No matching data for that exercise / date range.</p>
        ) : (
          <div className="bg-void border border-edgesoft rounded p-2">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={customChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292D38" vertical={false} />
                <XAxis dataKey="date" stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={{ stroke: "#333744" }} />
                <YAxis stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={false} width={55} />
                <Tooltip contentStyle={{ background: "#191C23", border: "1px solid #333744", borderRadius: 5, fontSize: 12 }} labelStyle={{ color: "#8F94A3" }} />
                <Line type="monotone" dataKey="value" name={metricLabel} stroke="#E3B23C" strokeWidth={2.5} dot={{ r: 3, fill: "#E3B23C" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <div className="font-display text-sm uppercase tracking-wide text-muted mb-3">Recent Workouts</div>
        <ul className="space-y-2">
          {logs
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map((l) => (
              <li key={l.id} className="bg-surface border border-edge rounded p-3 flex justify-between text-sm">
                <span>{new Date(l.date).toLocaleDateString()} — {l.exerciseName}</span>
                <span className="font-mono text-chalk">{l.volumeLoad} lb·reps</span>
              </li>
            ))}
        </ul>
        {logs.length === 0 && <p className="text-faint text-sm">Nothing logged yet.</p>}
      </div>
    </div>
  );
}

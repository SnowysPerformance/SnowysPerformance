"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

const FLAG_STYLES: Record<string, string> = {
  HIGH_RISK: "bg-red-950/40 text-red-300 border-red-800/50",
  ELEVATED_RISK: "bg-amber-950/40 text-amber-300 border-amber-800/50",
  OPTIMAL: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
  UNDERTRAINING: "bg-sky-950/40 text-sky-300 border-sky-800/50",
  INSUFFICIENT_DATA: "bg-raised text-faint border-edge",
};

export default function AthleteDetailPage({ params }: { params: { id: string } }) {
  const athleteId = params.id;
  const [athlete, setAthlete] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [fatigue, setFatigue] = useState<any>(null);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [pickProgramId, setPickProgramId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [athletes, workoutLogs, fatigueData, programsData] = await Promise.all([
        api("/api/teams/me/athletes"),
        api(`/api/workouts?athleteId=${athleteId}`),
        api(`/api/fatigue/${athleteId}`),
        api("/api/programs"),
      ]);
      setAthlete(athletes.find((a: any) => a.id === athleteId));
      setLogs(workoutLogs);
      setFatigue(fatigueData);
      setAllPrograms(programsData);
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const assignedPrograms = allPrograms.filter((p) => (p.assignments || []).some((asg: any) => asg.athlete.id === athleteId));
  const unassignedPrograms = allPrograms.filter((p) => !(p.assignments || []).some((asg: any) => asg.athlete.id === athleteId));

  async function assignProgram() {
    if (!pickProgramId) return;
    await api(`/api/programs/${pickProgramId}/assign`, { method: "POST", body: JSON.stringify({ athleteId }) });
    setPickProgramId("");
    load();
  }
  async function unassignProgram(programId: string) {
    await api(`/api/programs/${programId}/assign/${athleteId}`, { method: "DELETE" });
    load();
  }

  if (error) return <p className="text-red-400">{error}</p>;
  if (!athlete) return <p className="text-faint">Loading…</p>;

  // Build a volume-by-date series for the chart
  const byDate: Record<string, number> = {};
  logs.forEach((l) => {
    const d = new Date(l.date).toLocaleDateString();
    byDate[d] = (byDate[d] || 0) + l.volumeLoad;
  });
  const chartData = Object.entries(byDate)
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/athletes" className="text-xs text-faint underline hover:text-muted">
          ← Back to athletes
        </Link>
        <h1 className="font-display text-2xl font-semibold mt-2">{athlete.name}</h1>
        <p className="text-faint text-sm">{athlete.email}</p>
      </div>

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
        <div className="font-display text-sm uppercase tracking-wide text-muted mb-3">Training Volume Over Time</div>
        {chartData.length === 0 ? (
          <p className="text-faint text-sm">No workouts logged yet for this athlete.</p>
        ) : (
          <div className="bg-void border border-edgesoft rounded p-2">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292D38" vertical={false} />
                <XAxis dataKey="date" stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={{ stroke: "#333744" }} />
                <YAxis stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: "#191C23", border: "1px solid #333744", borderRadius: 5, fontSize: 12 }}
                  labelStyle={{ color: "#8F94A3" }}
                />
                <Line type="monotone" dataKey="volume" name="Volume (lb·reps)" stroke="#7EC8E3" strokeWidth={2.5} dot={{ r: 3, fill: "#7EC8E3" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <div className="font-display text-sm uppercase tracking-wide text-muted mb-3">Assigned Programs</div>
        {unassignedPrograms.length > 0 && (
          <div className="flex gap-2 mb-3">
            <select
              className="bg-inputbg border border-edge rounded px-2 py-2 text-sm flex-1 focus:border-accent outline-none"
              value={pickProgramId}
              onChange={(e) => setPickProgramId(e.target.value)}
            >
              <option value="">Choose a program to assign…</option>
              {unassignedPrograms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button onClick={assignProgram} className="bg-accent text-accenttext text-sm font-semibold rounded px-3 py-2 flex-shrink-0">Assign</button>
          </div>
        )}
        {assignedPrograms.length === 0 ? (
          <p className="text-faint text-sm">No programs assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {assignedPrograms.map((p) => (
              <li key={p.id} className="bg-surface border border-edge rounded p-3 text-sm flex items-center justify-between">
                <Link href={`/dashboard/programs/${p.id}`} className="text-accent underline">
                  {p.name}
                </Link>
                <button onClick={() => unassignProgram(p.id)} className="text-faint hover:text-red-400 text-xs">Unassign</button>
              </li>
            ))}
          </ul>
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
                <span>
                  {new Date(l.date).toLocaleDateString()} — {l.exerciseName}
                </span>
                <span className="font-mono text-chalk">{l.volumeLoad} lb·reps</span>
              </li>
            ))}
        </ul>
        {logs.length === 0 && <p className="text-faint text-sm">Nothing logged yet.</p>}
      </div>
    </div>
  );
}

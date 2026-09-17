"use client";
import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { e1rm, computePRs, METHOD_PALETTE } from "@/lib/prs";

const FLAG_STYLES: Record<string, string> = {
  HIGH_RISK: "bg-red-950/40 text-red-300 border-red-800/50",
  ELEVATED_RISK: "bg-amber-950/40 text-amber-300 border-amber-800/50",
  OPTIMAL: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
  UNDERTRAINING: "bg-sky-950/40 text-sky-300 border-sky-800/50",
  INSUFFICIENT_DATA: "bg-raised text-faint border-edge",
};

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none";

// Custom dot renderer for the exercise progression line: gold-rings any point
// that was an all-time PR when it happened, otherwise colors by training
// method (when that toggle is on).
function MethodDot(props: any) {
  const { cx, cy, payload, colorByMethod, methodColorMap } = props;
  if (cx == null || cy == null) return null;
  if (payload?.isWeightPR) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6.5} fill="#E3B23C" stroke="#14161C" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={2} fill="#14161C" />
      </g>
    );
  }
  const fill = colorByMethod && payload?.methodName ? methodColorMap[payload.methodName] || "#7EC8E3" : "#7EC8E3";
  return <circle cx={cx} cy={cy} r={3.5} fill={fill} />;
}

export default function AthleteProgressTab({ params }: { params: { id: string } }) {
  const athleteId = params.id;
  const [logs, setLogs] = useState<any[]>([]);
  const [fatigue, setFatigue] = useState<any>(null);

  const [customExercise, setCustomExercise] = useState("");
  const [customMetric, setCustomMetric] = useState<"volume" | "topWeight" | "e1rm">("e1rm");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [colorByMethod, setColorByMethod] = useState(true);

  useEffect(() => {
    (async () => {
      const [workoutLogs, fatigueData] = await Promise.all([api(`/api/workouts?athleteId=${athleteId}`), api(`/api/fatigue/${athleteId}`)]);
      setLogs(workoutLogs);
      setFatigue(fatigueData);
    })();
  }, [athleteId]);

  const { prMap, bestWeight, bestE1rm } = useMemo(() => computePRs(logs), [logs]);

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

  // Recent PRs strip — most recent logs that beat the athlete's all-time best at the time.
  const recentPRs = useMemo(() => {
    return logs
      .filter((l) => prMap[l.id]?.weightPR)
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
      .map((l) => ({ id: l.id, name: l.exerciseName, weight: prMap[l.id].topWeight, date: l.date }));
  }, [logs, prMap]);

  const customChartData = useMemo(() => {
    if (!customExercise) return [];
    return logs
      .filter((l) => l.exerciseName === customExercise && (l.type === "weighted" || !l.type))
      .filter((l) => (!fromDate || new Date(l.date) >= new Date(fromDate)) && (!toDate || new Date(l.date) <= new Date(toDate)))
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((l) => {
        const valid = (l.sets || []).filter((s: any) => s.weight > 0 && s.reps > 0);
        let value = 0;
        if (customMetric === "volume") value = l.volumeLoad;
        else if (customMetric === "topWeight") value = valid.length ? Math.max(...valid.map((s: any) => s.weight)) : 0;
        else value = valid.length ? Math.max(...valid.map((s: any) => Math.round(e1rm(s.weight, s.reps)))) : 0;
        return {
          date: new Date(l.date).toLocaleDateString(),
          value,
          isWeightPR: !!prMap[l.id]?.weightPR,
          methodName: l.methodName || "",
        };
      });
  }, [logs, customExercise, customMetric, fromDate, toDate, prMap]);

  const methodColorMap = useMemo(() => {
    const methods = Array.from(new Set(customChartData.map((p) => p.methodName).filter(Boolean)));
    const map: Record<string, string> = {};
    methods.forEach((m, i) => {
      map[m] = METHOD_PALETTE[i % METHOD_PALETTE.length];
    });
    return map;
  }, [customChartData]);

  const methodSegments = useMemo(() => {
    const segs: { methodName: string; start: string; end: string }[] = [];
    customChartData.forEach((p) => {
      const last = segs[segs.length - 1];
      if (last && last.methodName === p.methodName) last.end = p.date;
      else segs.push({ methodName: p.methodName, start: p.date, end: p.date });
    });
    return segs.filter((s) => s.methodName);
  }, [customChartData]);

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

      {recentPRs.length > 0 && (
        <div className="bg-surface border border-edge rounded p-4">
          <div className="font-display text-sm uppercase tracking-wide text-muted mb-3">Recent PRs</div>
          <div className="flex flex-wrap gap-2">
            {recentPRs.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-raised border border-edge rounded-full px-3 py-1.5 text-xs">
                <span className="bg-chalk text-accenttext font-bold rounded px-1.5 py-0.5 tracking-wide">PR</span>
                <span className="font-medium">{p.name}</span>
                <span className="font-mono text-chalk">{p.weight} lb</span>
                <span className="text-faint">{new Date(p.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
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
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="font-display text-sm uppercase tracking-wide text-muted">Custom Graph</div>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={colorByMethod} onChange={(e) => setColorByMethod(e.target.checked)} /> Color by method
          </label>
        </div>
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

        {customExercise && customChartData.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-3 text-xs">
            <div>
              <span className="text-faint">All-Time Best Top Weight: </span>
              <span className="font-mono text-chalk">{Math.round(bestWeight[customExercise] || 0)} lb</span>
            </div>
            <div>
              <span className="text-faint">All-Time Best Est. 1RM: </span>
              <span className="font-mono text-chalk">{Math.round(bestE1rm[customExercise] || 0)} lb</span>
            </div>
          </div>
        )}

        {!customExercise ? (
          <p className="text-faint text-sm">Pick an exercise above to see its trend.</p>
        ) : customChartData.length === 0 ? (
          <p className="text-faint text-sm">No matching data for that exercise / date range.</p>
        ) : (
          <>
            <div className="bg-void border border-edgesoft rounded p-2">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={customChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292D38" vertical={false} />
                  {colorByMethod &&
                    methodSegments.map((s, i) => <ReferenceArea key={i} x1={s.start} x2={s.end} fill={methodColorMap[s.methodName]} fillOpacity={0.08} />)}
                  <XAxis dataKey="date" stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={{ stroke: "#333744" }} />
                  <YAxis stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={false} width={55} />
                  <Tooltip contentStyle={{ background: "#191C23", border: "1px solid #333744", borderRadius: 5, fontSize: 12 }} labelStyle={{ color: "#8F94A3" }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#8F94A3" }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={`${metricLabel} (gold ring = PR)`}
                    stroke="#7EC8E3"
                    strokeWidth={2.5}
                    dot={(dotProps: any) => (
                      <MethodDot key={dotProps.key || dotProps.payload?.date} {...dotProps} colorByMethod={colorByMethod} methodColorMap={methodColorMap} />
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {colorByMethod && Object.keys(methodColorMap).length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2">
                {Object.entries(methodColorMap).map(([m, c]) => (
                  <div key={m} className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c }} /> {m}
                  </div>
                ))}
              </div>
            )}
          </>
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
              <li key={l.id} className="bg-surface border border-edge rounded p-3 flex justify-between items-center text-sm">
                <span>
                  {new Date(l.date).toLocaleDateString()} — {l.exerciseName}
                  {prMap[l.id]?.weightPR && <span className="ml-2 text-xs bg-chalk text-accenttext font-bold rounded px-1.5 py-0.5 tracking-wide">PR</span>}
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

"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

type WearableRow = {
  date: string;
  source: string;
  recovery: number | null;
  strain: number | null;
  sleepScore: number | null;
  restingHR: number | null;
};

// Recovery bands match WHOOP's own convention: green = well recovered,
// yellow = moderate, red = low. Used both for the latest-reading tile and
// for coloring the trend line.
function recoveryColor(recovery: number | null): string {
  if (recovery == null) return "#5B5F6E";
  if (recovery >= 67) return "#34D399"; // emerald
  if (recovery >= 34) return "#FBBF24"; // amber
  return "#F87171"; // red
}
function recoveryBand(recovery: number | null): string {
  if (recovery == null) return "—";
  if (recovery >= 67) return "Green";
  if (recovery >= 34) return "Yellow";
  return "Red";
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="flex-1 min-w-[110px] bg-void border border-edgesoft rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
      <div className="font-display text-2xl font-bold mt-0.5" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-faint mt-0.5">{sub}</div>}
    </div>
  );
}

// A bigger, dedicated WHOOP/wearable recovery panel — latest readings as
// large stat tiles plus a 14-day recovery trend, instead of one line of
// fine print buried inside the fatigue block.
export default function WearablePanel({ athleteId, context = "self" }: { athleteId: string; context?: "self" | "coach" }) {
  const [rows, setRows] = useState<WearableRow[] | null>(null);

  useEffect(() => {
    setRows(null);
    api(`/api/integrations/wearable/${athleteId}?days=14`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [athleteId]);

  if (rows === null) {
    return (
      <div className="bg-surface border border-edge rounded-lg p-4">
        <div className="font-display text-sm uppercase tracking-wide text-muted mb-3">Wearable Recovery</div>
        <p className="text-faint text-sm">Loading…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-surface border border-edge rounded-lg p-4">
        <div className="font-display text-sm uppercase tracking-wide text-muted mb-2">Wearable Recovery</div>
        <p className="text-faint text-sm">
          {context === "self"
            ? "No WHOOP data yet — connect WHOOP in Settings to see your recovery, strain, and sleep here."
            : "This athlete hasn't connected a wearable yet."}
        </p>
      </div>
    );
  }

  const latest = rows[rows.length - 1];
  const chartData = rows.map((r) => ({
    date: new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    recovery: r.recovery,
  }));

  return (
    <div className="bg-surface border border-edge rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-sm uppercase tracking-wide text-muted">Wearable Recovery</div>
        <span
          className="text-[10px] font-bold rounded px-2 py-1 border"
          style={{
            color: recoveryColor(latest.recovery),
            borderColor: recoveryColor(latest.recovery) + "80",
            background: recoveryColor(latest.recovery) + "1A",
          }}
        >
          {recoveryBand(latest.recovery)} · {new Date(latest.date).toLocaleDateString()}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Tile
          label="Recovery"
          value={latest.recovery != null ? `${Math.round(latest.recovery)}%` : "—"}
          accent={recoveryColor(latest.recovery)}
        />
        <Tile label="Strain" value={latest.strain != null ? latest.strain.toFixed(1) : "—"} accent="#7EC8E3" />
        <Tile label="Sleep Score" value={latest.sleepScore != null ? `${Math.round(latest.sleepScore)}%` : "—"} accent="#B79CED" />
        <Tile label="Resting HR" value={latest.restingHR != null ? `${Math.round(latest.restingHR)} bpm` : "—"} sub={latest.restingHR != null ? "beats/min" : undefined} />
      </div>

      <div className="bg-void border border-edgesoft rounded p-2">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="recoveryFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7EC8E3" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#7EC8E3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#292D38" vertical={false} />
            <XAxis dataKey="date" stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={{ stroke: "#333744" }} />
            <YAxis stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={false} width={36} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "#191C23", border: "1px solid #333744", borderRadius: 5, fontSize: 12 }}
              labelStyle={{ color: "#8F94A3" }}
              formatter={(v: any) => [v != null ? `${v}%` : "—", "Recovery"]}
            />
            <Area type="monotone" dataKey="recovery" stroke="#7EC8E3" strokeWidth={2.5} fill="url(#recoveryFill)" connectNulls dot={{ r: 3, fill: "#7EC8E3" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] text-faint mt-2">Last 14 days · recovery %</div>
    </div>
  );
}

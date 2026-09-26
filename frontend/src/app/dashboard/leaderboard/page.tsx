"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

// Team leaderboards — coaches and athletes both see this, always limited to
// their own team. Four categories: strength (best estimated 1RM), relative
// strength (1RM ÷ latest logged bodyweight), test results, and consistency
// (training days logged). Recalculated fresh from the team's logs on every
// page load.

type Entry = { athleteId: string; name: string; value: number; secondary?: number | null; date?: string | null };
type Board = { name: string; unit: string; lowerIsBetter?: boolean; entries: Entry[] };
type Data = {
  athleteCount: number;
  lifts: Board[];
  relative: Board[];
  tests: Board[];
  consistency: { days7: Entry[]; days30: Entry[] };
};

const TABS = [
  { key: "lifts", label: "Strength" },
  { key: "relative", label: "Relative Strength" },
  { key: "tests", label: "Testing" },
  { key: "consistency", label: "Consistency" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const MEDALS = ["🥇", "🥈", "🥉"];

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, "");
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("lifts");
  const [boardName, setBoardName] = useState("");
  const [period, setPeriod] = useState<"days7" | "days30">("days7");

  useEffect(() => {
    if (!user) return;
    api("/api/leaderboard/team")
      .then(setData)
      .catch((e) => setError(e.message || "Could not load the leaderboard"));
  }, [user]);

  const boards: Board[] = useMemo(() => {
    if (!data || tab === "consistency") return [];
    return data[tab];
  }, [data, tab]);

  // Keep a valid board selected when switching tabs.
  useEffect(() => {
    if (tab === "consistency") return;
    if (!boards.find((b) => b.name === boardName)) setBoardName(boards[0]?.name || "");
  }, [boards, boardName, tab]);

  const selectCls = "bg-inputbg border border-edge rounded px-2 py-2 text-sm focus:border-accent outline-none";

  let board: Board | null = null;
  if (data && tab === "consistency") {
    board = { name: period === "days7" ? "Last 7 days" : "Last 30 days", unit: "days", entries: data.consistency[period] };
  } else {
    board = boards.find((b) => b.name === boardName) || null;
  }

  // Standard competition ranking: ties share a place (1, 2, 2, 4).
  const ranks: number[] = [];
  board?.entries.forEach((e, i) => {
    ranks.push(i > 0 && e.value === board!.entries[i - 1].value ? ranks[i - 1] : i + 1);
  });

  const isCoach = user?.role === "COACH";

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-xl font-semibold mb-1">Team Leaderboard</h1>
      <p className="text-sm text-faint mb-4">
        {isCoach
          ? "Rankings for your team only. Athletes on your team can see this page too — never other teams."
          : "See how you stack up against your teammates. Only your team can see this."}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "rounded px-3 py-1.5 text-[13px] font-medium border transition-colors " +
              (tab === t.key ? "text-primary border-accent/40" : "text-muted border-edge hover:text-primary hover:bg-raised")
            }
            style={tab === t.key ? { background: "rgba(126,200,227,0.14)", borderColor: "rgba(126,200,227,0.4)" } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {!data && !error && <p className="text-sm text-faint">Loading…</p>}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {tab === "consistency" ? (
              <select className={selectCls} value={period} onChange={(e) => setPeriod(e.target.value as any)}>
                <option value="days7">Last 7 days</option>
                <option value="days30">Last 30 days</option>
              </select>
            ) : boards.length > 0 ? (
              <select className={selectCls} value={boardName} onChange={(e) => setBoardName(e.target.value)}>
                {boards.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} ({b.entries.length})
                  </option>
                ))}
              </select>
            ) : null}
            <span className="text-xs text-faint">
              {tab === "lifts" && "Ranked by best estimated 1RM. Top set shown underneath."}
              {tab === "relative" && "Best estimated 1RM ÷ most recent logged bodyweight."}
              {tab === "tests" && (board?.lowerIsBetter ? "Best result — lower (faster) is better." : "Best result — higher is better.")}
              {tab === "consistency" && "Number of different days with a logged workout."}
            </span>
          </div>

          {tab !== "consistency" && boards.length === 0 && (
            <div className="bg-surface border border-edge rounded p-4 text-sm text-faint">
              {tab === "lifts" && "No weighted lifts logged yet. Once athletes log workouts, the rankings show up here."}
              {tab === "relative" &&
                "Relative strength needs a bodyweight. Log a “Bodyweight” result on the Testing page for each athlete to include them."}
              {tab === "tests" && "No test results logged yet. Sprints, jumps and other tests show up here once they're logged."}
            </div>
          )}

          {board && board.entries.length > 0 && (
            <ol className="space-y-1.5">
              {board.entries.map((e, i) => {
                const me = e.athleteId === user?.id;
                const rank = ranks[i];
                return (
                  <li
                    key={e.athleteId}
                    className={
                      "flex items-center gap-3 rounded border px-3 py-2.5 " + (me ? "border-accent/60" : "bg-surface border-edge")
                    }
                    style={me ? { background: "rgba(126,200,227,0.10)", borderColor: "rgba(126,200,227,0.5)" } : undefined}
                  >
                    <span className="w-8 text-center font-display font-semibold text-muted flex-shrink-0">
                      {rank <= 3 && e.value > 0 ? MEDALS[rank - 1] : rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {e.name}
                        {me && <span className="ml-2 text-[11px] text-accent font-semibold">YOU</span>}
                      </div>
                      {tab === "lifts" && e.secondary != null && (
                        <div className="text-[11.5px] text-faint">Top set {fmt(e.secondary)} lb</div>
                      )}
                      {tab === "relative" && e.secondary != null && (
                        <div className="text-[11.5px] text-faint">Est. 1RM {fmt(e.secondary)} lb</div>
                      )}
                      {tab === "tests" && e.date && (
                        <div className="text-[11.5px] text-faint">{new Date(e.date).toLocaleDateString()}</div>
                      )}
                    </div>
                    <span className="font-mono text-sm text-good whitespace-nowrap">
                      {fmt(e.value)} {board!.unit}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {tab === "relative" && data.relative.length > 0 && (
            <p className="text-xs text-faint mt-3">
              Athletes without a logged bodyweight aren't listed here — log a “Bodyweight” test result to add them.
            </p>
          )}
        </>
      )}
    </div>
  );
}

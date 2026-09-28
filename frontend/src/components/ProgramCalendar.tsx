"use client";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { vbtFromExercise } from "@/lib/planTargets";

// Month calendar for one program. Every week with a start date puts its
// days on real dates (start date + the day's offset). Coaches can drag a
// workout onto another date to move it there (swapping with whatever was
// already on that date), and can put the whole program on the calendar in
// one step by picking a start date — each week then starts 7 days after
// the one before it, in phase/week order.
//
// Dates are handled as UTC "YYYY-MM-DD" keys throughout, matching how the
// week view and "Today's Workout" already work out dates.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function keyOf(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}
function utcMidnight(v: string | Date) {
  const d = new Date(v);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

type Slot = { day: any; week: any; phase: any };

export default function ProgramCalendar({
  program,
  isCoach,
  onChanged,
  onOpenDay,
}: {
  program: any;
  isCoach: boolean;
  onChanged: () => Promise<void> | void;
  onOpenDay: (phaseId: string, weekId: string) => void;
}) {
  const todayKey = new Date().toISOString().slice(0, 10);

  // Weeks in program order: phases as listed, weeks by week number.
  const orderedWeeks = useMemo(() => {
    const out: { week: any; phase: any }[] = [];
    for (const ph of program.phases || []) {
      const weeks = [...(ph.microcycles || [])].sort((a: any, b: any) => (a.weekNumber || 0) - (b.weekNumber || 0));
      weeks.forEach((w: any) => out.push({ week: w, phase: ph }));
    }
    return out;
  }, [program]);

  // dateKey -> the program day that falls on it.
  const slots = useMemo(() => {
    const map: Record<string, Slot> = {};
    for (const { week, phase } of orderedWeeks) {
      if (!week.startDate) continue;
      const start = utcMidnight(week.startDate);
      for (const day of week.days || []) {
        map[keyOf(start + day.dayOfWeek * DAY_MS)] = { day, week, phase };
      }
    }
    return map;
  }, [orderedWeeks]);

  const unscheduled = orderedWeeks.filter(({ week }) => !week.startDate).length;

  // Start on the month containing today if the program covers it, else the
  // first scheduled date, else today's month.
  const initialMonth = useMemo(() => {
    const keys = Object.keys(slots).sort();
    const pick = slots[todayKey] || keys.length === 0 ? todayKey : keys[0];
    return pick.slice(0, 7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [month, setMonth] = useState(initialMonth); // "YYYY-MM"
  const [dragDayId, setDragDayId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [startDate, setStartDate] = useState(() => {
    // Default "schedule from" date: the next Monday.
    const now = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
    const dow = (new Date(now).getUTCDay() + 6) % 7; // 0 = Monday
    return keyOf(now + ((7 - dow) % 7) * DAY_MS);
  });

  const [y, m] = month.split("-").map(Number);
  const first = Date.UTC(y, m - 1, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7; // blanks before the 1st (Monday-first)
  const gridStart = first - lead * DAY_MS;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cellCount = Math.ceil((lead + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, i) => gridStart + i * DAY_MS);
  const monthLabel = new Date(first).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  }

  async function drop(targetKey: string) {
    const target = slots[targetKey];
    const fromId = dragDayId;
    setDragDayId(null);
    setOverKey(null);
    if (!fromId || !target || target.day.id === fromId) return;
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/programs/days/${fromId}/swap`, { method: "POST", body: JSON.stringify({ targetDayId: target.day.id }) });
      await onChanged();
    } catch (err: any) {
      setMsg(err.message || "Couldn't move that workout");
    } finally {
      setBusy(false);
    }
  }

  async function scheduleAll() {
    if (!startDate || orderedWeeks.length === 0) return;
    const alreadyDated = orderedWeeks.some(({ week }) => week.startDate);
    if (alreadyDated && !confirm("This will re-date every week in the program, starting " + startDate + ", one week after another. Continue?")) return;
    setBusy(true);
    setMsg("");
    try {
      const start = Date.parse(`${startDate}T00:00:00.000Z`);
      for (let i = 0; i < orderedWeeks.length; i++) {
        await api(`/api/programs/weeks/${orderedWeeks[i].week.id}`, {
          method: "PATCH",
          body: JSON.stringify({ startDate: keyOf(start + i * 7 * DAY_MS) }),
        });
      }
      await onChanged();
      setMonth(startDate.slice(0, 7));
    } catch (err: any) {
      setMsg(err.message || "Couldn't schedule the program");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface border border-edge rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="text-xs text-muted hover:text-primary border border-edge rounded px-2 py-1">←</button>
          <div className="font-display text-sm font-semibold min-w-[150px] text-center">{monthLabel}</div>
          <button onClick={() => shiftMonth(1)} className="text-xs text-muted hover:text-primary border border-edge rounded px-2 py-1">→</button>
          <button onClick={() => setMonth(todayKey.slice(0, 7))} className="text-xs text-accent underline ml-1">Today</button>
        </div>
        {isCoach && orderedWeeks.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-faint">Put the whole program on the calendar starting</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-inputbg border border-edge rounded px-2 py-1 text-xs outline-none focus:border-accent"
            />
            <button disabled={busy} onClick={scheduleAll} className="text-xs bg-accent text-accenttext font-semibold rounded px-2.5 py-1 disabled:opacity-40">
              Schedule
            </button>
          </div>
        )}
      </div>

      {unscheduled > 0 && (
        <p className="text-[11px] text-faint mb-2">
          {unscheduled} week{unscheduled > 1 ? "s" : ""} {unscheduled > 1 ? "don't" : "doesn't"} have a start date yet, so {unscheduled > 1 ? "they aren't" : "it isn't"} on the calendar.
          {isCoach ? " Use Schedule above, or set a start date in the week view." : ""}
        </p>
      )}
      {isCoach && (
        <p className="text-[11px] text-faint mb-2">Drag a workout onto another date to move it there — dropping it on a planned day swaps the two. Click a workout to open that week.</p>
      )}
      {msg && <p className="text-xs text-red-300 mb-2">{msg}</p>}

      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[720px]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-[10px] uppercase tracking-wide text-faint text-center pb-1">{d}</div>
          ))}
          {cells.map((ms) => {
            const k = keyOf(ms);
            const slot = slots[k];
            const inMonth = k.slice(0, 7) === month;
            const exercises: any[] = slot?.day.exercises || [];
            const isToday = k === todayKey;
            const droppable = isCoach && !!dragDayId && !!slot;
            return (
              <div
                key={k}
                onDragOver={(e) => {
                  if (droppable) {
                    e.preventDefault();
                    setOverKey(k);
                  }
                }}
                onDragLeave={() => overKey === k && setOverKey(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(k);
                }}
                className={
                  "min-h-[110px] rounded border p-1.5 flex flex-col gap-1 " +
                  (inMonth ? "bg-void" : "bg-void opacity-40") +
                  (overKey === k ? " border-accent" : isToday ? " border-chalk" : " border-edgesoft")
                }
                style={overKey === k ? { background: "rgba(126,200,227,0.10)" } : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className={"text-[11px] font-semibold " + (isToday ? "text-chalk" : "text-muted")}>{new Date(ms).getUTCDate()}</span>
                  {slot && <span className="text-[9px] text-faint truncate max-w-[70%]">{slot.week.name}</span>}
                </div>
                {slot && exercises.length > 0 && (
                  <div
                    draggable={isCoach && !busy}
                    onDragStart={() => setDragDayId(slot.day.id)}
                    onDragEnd={() => {
                      setDragDayId(null);
                      setOverKey(null);
                    }}
                    onClick={() => onOpenDay(slot.phase.id, slot.week.id)}
                    title={isCoach ? "Drag to move · click to open" : "Click to open"}
                    className={
                      "rounded border border-accent/40 px-1.5 py-1 text-left " +
                      (isCoach ? "cursor-grab active:cursor-grabbing" : "cursor-pointer") +
                      (dragDayId === slot.day.id ? " opacity-40" : "")
                    }
                    style={{ background: "rgba(126,200,227,0.12)", borderColor: "rgba(126,200,227,0.4)" }}
                  >
                    {slot.day.name && <div className="text-[10px] font-bold text-accent truncate">{slot.day.name}</div>}
                    {exercises.slice(0, 4).map((ex: any) => (
                      <div key={ex.id} className="text-[10px] text-primary truncate">
                        {ex.exerciseName || "Exercise"}
                        {vbtFromExercise(ex) ? " ⚡" : ""}
                      </div>
                    ))}
                    {exercises.length > 4 && <div className="text-[10px] text-faint">+{exercises.length - 4} more</div>}
                  </div>
                )}
                {slot && exercises.length === 0 && <div className="text-[10px] text-faint">Rest</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

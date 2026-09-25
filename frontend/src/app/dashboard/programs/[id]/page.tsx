"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { computeBestE1rm, computedWeight, targetLabel, hasSetDetails, computedWeightForSet, setTargetLabel } from "@/lib/planTargets";

// HTML-escape a value before interpolating it into the printable day sheet
// built in printDay() below — exercise names/notes are free text a coach
// typed, so this keeps a stray "<" or "&" from breaking the print layout.
function escapeHtml(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

const inputClass = "bg-inputbg border border-edge rounded px-2 py-1.5 text-xs placeholder-faint focus:border-accent outline-none w-full";

// deep-update a single exercise inside the nested program tree, keeping every
// untouched object reference stable so unrelated cards don't re-render
function patchExerciseInProgram(program: any, exerciseId: string, patch: any) {
  return {
    ...program,
    phases: program.phases.map((ph: any) => ({
      ...ph,
      microcycles: ph.microcycles.map((w: any) => ({
        ...w,
        days: w.days.map((d: any) => {
          if (!d.exercises.some((ex: any) => ex.id === exerciseId)) return d;
          return { ...d, exercises: d.exercises.map((ex: any) => (ex.id === exerciseId ? { ...ex, ...patch } : ex)) };
        }),
      })),
    })),
  };
}

// Finds the phase/week/day that lines up with today's real calendar date
// (matched against whichever week has a start date set), so the page can
// default to showing today's work instead of always Phase 1 / Week 1 — and
// so the day tab that matches can get a "Today" badge. Mirrors the same
// date math the backend's /api/programs/today endpoint uses.
function findTodayMatch(program: any): { phaseId: string; weekId: string; dayId: string } | null {
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(`${today}T00:00:00.000Z`).getTime();
  for (const ph of program.phases) {
    for (const w of ph.microcycles) {
      if (!w.startDate) continue;
      const weekStart = new Date(w.startDate);
      weekStart.setUTCHours(0, 0, 0, 0);
      const offsetDays = Math.round((todayStart - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      if (offsetDays < 0 || offsetDays > 6) continue;
      const day = w.days.find((d: any) => d.dayOfWeek === offsetDays);
      if (!day) continue;
      return { phaseId: ph.id, weekId: w.id, dayId: day.id };
    }
  }
  return null;
}

// patch a single phase's own fields (e.g. renaming it)
function patchPhaseInProgram(program: any, phaseId: string, patch: any) {
  return { ...program, phases: program.phases.map((p: any) => (p.id === phaseId ? { ...p, ...patch } : p)) };
}

// patch a single week's own fields (e.g. renaming it), wherever it lives in the phase tree
function patchWeekInProgram(program: any, weekId: string, patch: any) {
  return {
    ...program,
    phases: program.phases.map((ph: any) => ({
      ...ph,
      microcycles: ph.microcycles.map((w: any) => (w.id === weekId ? { ...w, ...patch } : w)),
    })),
  };
}

// reorder a day's exercises to match an explicit id order (used after drag-and-drop)
function reorderDayInProgram(program: any, dayId: string, orderedIds: string[]) {
  return {
    ...program,
    phases: program.phases.map((ph: any) => ({
      ...ph,
      microcycles: ph.microcycles.map((w: any) => ({
        ...w,
        days: w.days.map((d: any) => {
          if (d.id !== dayId) return d;
          const byId: Record<string, any> = {};
          d.exercises.forEach((ex: any) => { byId[ex.id] = ex; });
          return { ...d, exercises: orderedIds.map((id, i) => ({ ...byId[id], order: i })) };
        }),
      })),
    })),
  };
}

export default function ProgramDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const isCoach = user?.role === "COACH";
  const [program, setProgram] = useState<any>(null);
  const [error, setError] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [bestE1rm, setBestE1rm] = useState<Record<string, number>>({});
  const [previewAthleteId, setPreviewAthleteId] = useState("");
  const [library, setLibrary] = useState<any[]>([]);
  const [dragging, setDragging] = useState<{ dayId: string; blockIdx: number } | null>(null);

  const pendingPatches = useRef<Record<string, any>>({});
  const saveTimers = useRef<Record<string, any>>({});

  useEffect(() => {
    api("/api/library").then(setLibrary).catch(console.error);
  }, []);

  const [phaseForm, setPhaseForm] = useState({ name: "", weeks: "", goal: "" });
  const [phaseFormOpen, setPhaseFormOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [groupLabel, setGroupLabel] = useState("");

  async function load() {
    try {
      setProgram(await api(`/api/programs/${params.id}`));
      setError("");
    } catch (err: any) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Load 1RM data: athlete sees their own; coach picks an assigned athlete to preview against
  useEffect(() => {
    (async () => {
      if (!program) return;
      if (!isCoach) {
        const logs = await api("/api/workouts");
        setBestE1rm(computeBestE1rm(logs));
        return;
      }
      const athleteId = previewAthleteId || program.assignments?.[0]?.athlete?.id;
      if (!athleteId) return setBestE1rm({});
      const logs = await api(`/api/workouts?athleteId=${athleteId}`);
      setBestE1rm(computeBestE1rm(logs));
    })();
  }, [program, previewAthleteId, isCoach]);

  if (error && !program) return <p className="text-red-400">{error}</p>;
  if (!program) return <p className="text-faint">Loading…</p>;

  // Default to whatever phase/week lines up with today (if the coach set week
  // start dates) instead of always Phase 1 / Week 1 — but only until the
  // athlete or coach clicks a different phase/week themselves.
  const todayMatch = findTodayMatch(program);
  const phase =
    program.phases.find((p: any) => p.id === selectedPhaseId) ||
    (!selectedPhaseId && todayMatch && program.phases.find((p: any) => p.id === todayMatch.phaseId)) ||
    program.phases[0];
  const week =
    phase?.microcycles.find((w: any) => w.id === selectedWeekId) ||
    (!selectedWeekId && todayMatch && phase?.id === todayMatch.phaseId && phase?.microcycles.find((w: any) => w.id === todayMatch.weekId)) ||
    phase?.microcycles[0];

  async function guard(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err: any) {
      setError(err.message || "Something went wrong saving that — try again");
    }
  }

  async function addPhase() {
    if (!phaseForm.name.trim()) return;
    await guard(async () => {
      await api(`/api/programs/${params.id}/phases`, { method: "POST", body: JSON.stringify(phaseForm) });
      setPhaseForm({ name: "", weeks: "", goal: "" });
      setPhaseFormOpen(false);
      await load();
    });
  }
  async function deletePhase(phaseId: string) {
    await guard(async () => {
      await api(`/api/programs/phases/${phaseId}`, { method: "DELETE" });
      await load();
    });
  }
  async function addWeek(phaseId: string) {
    await guard(async () => {
      const w = await api(`/api/programs/phases/${phaseId}/weeks`, { method: "POST", body: JSON.stringify({}) });
      setSelectedPhaseId(phaseId);
      setSelectedWeekId(w.id);
      await load();
    });
  }
  async function duplicateWeek(weekId: string) {
    await guard(async () => {
      const w = await api(`/api/programs/weeks/${weekId}/duplicate`, { method: "POST" });
      setSelectedWeekId(w.id);
      await load();
    });
  }
  async function deleteWeek(weekId: string) {
    await guard(async () => {
      await api(`/api/programs/weeks/${weekId}`, { method: "DELETE" });
      await load();
    });
  }
  async function addExercise(dayId: string) {
    await guard(async () => {
      await api(`/api/programs/days/${dayId}/exercises`, { method: "POST", body: JSON.stringify({ exerciseName: "", type: "weighted", mode: "percent" }) });
      await load();
    });
  }

  // Instant local update + debounced background save — this is what keeps typing
  // fast: every keystroke updates the screen immediately, but only one network
  // request goes out ~500ms after you stop typing, and it no longer reloads the
  // whole plan from the server on every letter.
  function updateExercise(exerciseId: string, patch: any) {
    setProgram((prev: any) => (prev ? patchExerciseInProgram(prev, exerciseId, patch) : prev));
    pendingPatches.current[exerciseId] = { ...(pendingPatches.current[exerciseId] || {}), ...patch };
    clearTimeout(saveTimers.current[exerciseId]);
    saveTimers.current[exerciseId] = setTimeout(() => flushExercise(exerciseId), 500);
  }

  async function flushExercise(exerciseId: string) {
    const patch = pendingPatches.current[exerciseId];
    if (!patch) return;
    delete pendingPatches.current[exerciseId];
    try {
      await api(`/api/programs/exercises/${exerciseId}`, { method: "PATCH", body: JSON.stringify(patch) });
    } catch (err: any) {
      setError(err.message || "Couldn't save that change — reloading the plan");
      load();
    }
  }

  // Same instant-local-update + debounced-save pattern as updateExercise/flushExercise
  // above, generalized for renaming a phase or a week — every keystroke updates the
  // screen immediately, and one PATCH goes out ~500ms after typing stops.
  function debouncedUpdate(key: string, patch: any, apply: (prev: any) => any, endpoint: string) {
    setProgram((prev: any) => (prev ? apply(prev) : prev));
    pendingPatches.current[key] = { ...(pendingPatches.current[key] || {}), ...patch };
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => flushGeneric(key, endpoint), 500);
  }
  async function flushGeneric(key: string, endpoint: string) {
    const patch = pendingPatches.current[key];
    if (!patch) return;
    delete pendingPatches.current[key];
    try {
      await api(endpoint, { method: "PATCH", body: JSON.stringify(patch) });
    } catch (err: any) {
      setError(err.message || "Couldn't save that change — reloading the plan");
      load();
    }
  }
  function updatePhaseName(phaseId: string, name: string) {
    debouncedUpdate(`phase:${phaseId}`, { name }, (prev) => patchPhaseInProgram(prev, phaseId, { name }), `/api/programs/phases/${phaseId}`);
  }
  function updateWeekName(weekId: string, name: string) {
    debouncedUpdate(`week:${weekId}`, { name }, (prev) => patchWeekInProgram(prev, weekId, { name }), `/api/programs/weeks/${weekId}`);
  }

  async function deleteExercise(exerciseId: string) {
    await guard(async () => {
      await api(`/api/programs/exercises/${exerciseId}`, { method: "DELETE" });
      await load();
    });
  }
  async function groupSelected(dayId: string) {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length < 1) return;
    await guard(async () => {
      await api(`/api/programs/days/${dayId}/group`, { method: "POST", body: JSON.stringify({ exerciseIds: ids, label: groupLabel || "Group" }) });
      setSelected({});
      setGroupLabel("");
      await load();
    });
  }
  async function ungroup(dayId: string, groupId: string) {
    await guard(async () => {
      await api(`/api/programs/days/${dayId}/group/${groupId}/ungroup`, { method: "POST" });
      await load();
    });
  }
  // Sends the athlete to the workouts page with the whole day's plan loaded
  // (every exercise, not just one) so they can log the full workout in one
  // place, with each exercise's prescribed weight pre-filled and editable.
  function logDay(dayId: string) {
    router.push(`/dashboard/workouts?programId=${params.id}&dayId=${dayId}`);
  }

  function buildBlocks(day: any) {
    const seen = new Set<string>();
    const blocks: any[] = [];
    let letterIdx = 0;
    day.exercises.forEach((ex: any) => {
      if (ex.groupId) {
        if (seen.has(ex.groupId)) return;
        seen.add(ex.groupId);
        const members = day.exercises.filter((x: any) => x.groupId === ex.groupId);
        blocks.push({ type: "group", groupId: ex.groupId, label: ex.groupLabel, letter: String.fromCharCode(65 + letterIdx++), members });
      } else blocks.push({ type: "single", ex });
    });
    return blocks;
  }

  function handleBlockDrop(day: any, blocks: any[], targetIdx: number) {
    if (!dragging || dragging.dayId !== day.id || dragging.blockIdx === targetIdx) { setDragging(null); return; }
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(dragging.blockIdx, 1);
    newBlocks.splice(targetIdx, 0, moved);
    const orderedIds: string[] = [];
    newBlocks.forEach((b: any) => {
      if (b.type === "single") orderedIds.push(b.ex.id);
      else b.members.forEach((m: any) => orderedIds.push(m.id));
    });
    setDragging(null);
    setProgram((prev: any) => (prev ? reorderDayInProgram(prev, day.id, orderedIds) : prev));
    guard(async () => {
      await api(`/api/programs/days/${day.id}/reorder`, { method: "POST", body: JSON.stringify({ order: orderedIds }) });
    });
  }

  // Opens a separate window with just one day's exercises, formatted as a
  // clean printable sheet (team name, exercise/sets-reps/target/rest/notes),
  // and triggers the browser's print dialog on it. Kept as its own window
  // rather than @media print CSS on this page so the phase/week picker,
  // nav bar, and every other day don't end up on the page too.
  function printDay(day: any, weekLabel: string, dayDateLabel: string | null) {
    const blocks = buildBlocks(day);
    const teamName = program.team?.name || "";

    function exerciseRow(ex: any, letterTag?: string) {
      const isTimeBased = ex.type === "timed" || ex.type === "sprint";
      const tags = [ex.methodName, ex.isWarmup ? "Warm-up" : "", ex.isTest ? "Test" : ""].filter(Boolean).join(" · ");
      let setsRepsHtml: string;
      let targetHtml: string;
      if (hasSetDetails(ex)) {
        setsRepsHtml = ex.setDetails
          .map((s: any, i: number) => `${i + 1}. ${escapeHtml(isTimeBased ? `${s.duration || ex.duration || "—"}s` : String(s.reps || ex.reps || "—"))}`)
          .join("<br/>");
        targetHtml = ex.setDetails.map((s: any) => escapeHtml(setTargetLabel(ex, s, bestE1rm))).join("<br/>");
      } else {
        setsRepsHtml = escapeHtml(`${ex.sets || "—"} x ${isTimeBased ? `${ex.duration || "—"}s` : ex.reps || "—"}`);
        targetHtml = escapeHtml(targetLabel(ex, bestE1rm));
      }
      return `
        <tr>
          <td class="ex-name">${letterTag ? `<span class="letter">${escapeHtml(letterTag)}</span>` : ""}${escapeHtml(ex.exerciseName || "Exercise")}${tags ? `<div class="tags">${escapeHtml(tags)}</div>` : ""}</td>
          <td>${setsRepsHtml}</td>
          <td>${targetHtml}</td>
          <td>${ex.restSeconds ? escapeHtml(`${ex.restSeconds}s`) : ""}</td>
          <td class="notes">${escapeHtml(ex.notes || "")}</td>
        </tr>`;
    }

    const rows = blocks.length
      ? blocks
          .map((b: any) =>
            b.type === "single"
              ? exerciseRow(b.ex)
              : `<tr><td colspan="5" class="group-label">${escapeHtml(b.label)}${b.label && b.groupLabel ? " — " : ""}${escapeHtml(b.groupLabel || "")}</td></tr>` +
                b.members.map((m: any, i: number) => exerciseRow(m, `${b.letter}${i + 1}`)).join("")
          )
          .join("")
      : `<tr><td colspan="5" class="rest">Rest day</td></tr>`;

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(program.name)} — ${escapeHtml(day.label)}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 32px; }
  .header { border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
  .team { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
  .program { font-size: 14px; color: #444; margin-top: 4px; }
  .meta { font-size: 15px; font-weight: 700; margin-top: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: #666; border-bottom: 2px solid #111; padding: 6px 8px; }
  td { border-bottom: 1px solid #ddd; padding: 8px; font-size: 13px; vertical-align: top; }
  .ex-name { font-weight: 600; min-width: 140px; }
  .letter { display: inline-block; width: 18px; color: #666; font-weight: 700; }
  .tags { font-size: 10px; color: #888; font-weight: 400; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.02em; }
  .group-label { font-weight: 700; font-size: 12px; text-transform: uppercase; color: #333; padding-top: 16px; border-bottom: none; }
  .notes { color: #444; font-style: italic; white-space: pre-wrap; }
  .rest { text-align: center; color: #888; font-style: italic; padding: 24px 8px; }
  .footer { margin-top: 36px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <div class="header">
    ${teamName ? `<div class="team">${escapeHtml(teamName)}</div>` : ""}
    <div class="program">${escapeHtml(program.name)}${phase ? ` · ${escapeHtml(phase.name)}` : ""}${weekLabel ? ` · ${escapeHtml(weekLabel)}` : ""}</div>
    <div class="meta">${escapeHtml(day.label)}${dayDateLabel ? ` — ${escapeHtml(dayDateLabel)}` : ""}</div>
  </div>
  <table>
    <thead><tr><th>Exercise</th><th>Sets x Reps</th><th>Target</th><th>Rest</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Snowy's Performance</div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=850,height=1100");
    if (!w) {
      setError("Your browser blocked the print window — allow pop-ups for this site and try again.");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {}
    }, 250);
  }

  return (
    <div>
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-2 mb-4 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-300 hover:text-white flex-shrink-0">✕</button>
        </div>
      )}
      <h1 className="font-display text-xl font-semibold mb-1">{program.name}</h1>
      <datalist id="ex-lib">
        {library.map((it: any) => (
          <option key={it.id} value={it.name} />
        ))}
      </datalist>
      {isCoach && program.assignments?.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-faint">Preview 1RM for:</span>
          <select className={inputClass} style={{ width: 200 }} value={previewAthleteId} onChange={(e) => setPreviewAthleteId(e.target.value)}>
            {program.assignments.map((a: any) => (
              <option key={a.athlete.id} value={a.athlete.id}>{a.athlete.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Phases */}
      <div className="bg-surface border border-edge rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="font-display text-xs uppercase tracking-wide text-muted">Phases</span>
          {isCoach && <button onClick={() => setPhaseFormOpen((o) => !o)} className="text-xs text-accent underline">+ Add phase</button>}
        </div>
        {phaseFormOpen && (
          <div className="flex gap-2 mb-3">
            <input className={inputClass} placeholder="Phase name" value={phaseForm.name} onChange={(e) => setPhaseForm((f) => ({ ...f, name: e.target.value }))} />
            <input className={inputClass} style={{ maxWidth: 80 }} placeholder="Weeks" value={phaseForm.weeks} onChange={(e) => setPhaseForm((f) => ({ ...f, weeks: e.target.value }))} />
            <input className={inputClass} placeholder="Goal" value={phaseForm.goal} onChange={(e) => setPhaseForm((f) => ({ ...f, goal: e.target.value }))} />
            <button onClick={addPhase} className="bg-accent text-accenttext text-xs font-semibold rounded px-3 py-1.5 flex-shrink-0">Create</button>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto">
          {program.phases.map((p: any) => (
            <div
              key={p.id}
              onClick={() => { setSelectedPhaseId(p.id); setSelectedWeekId(null); }}
              className={`flex-shrink-0 min-w-[130px] rounded-lg border p-3 cursor-pointer relative ${p.id === phase?.id ? "border-accent bg-raised" : "border-edgesoft bg-void"}`}
            >
              {isCoach && (
                <button onClick={(e) => { e.stopPropagation(); deletePhase(p.id); }} className="absolute top-1 right-1 text-faint hover:text-red-400 text-xs">✕</button>
              )}
              {isCoach ? (
                <input
                  value={p.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updatePhaseName(p.id, e.target.value)}
                  className="font-display text-sm font-semibold pr-4 bg-transparent border-none outline-none w-full focus:bg-void rounded"
                />
              ) : (
                <div className="font-display text-sm font-semibold pr-4">{p.name}</div>
              )}
              {p.goal && <div className="text-xs text-muted mt-1">{p.goal}</div>}
            </div>
          ))}
          {program.phases.length === 0 && <p className="text-faint text-xs">No phases yet.</p>}
        </div>
      </div>

      {/* Weeks */}
      {phase && (
        <div className="bg-surface border border-edge rounded-lg p-4 mb-4">
          <div className="font-display text-xs uppercase tracking-wide text-muted mb-3">{phase.name} — Weeks</div>
          <div className="flex gap-3 overflow-x-auto items-start">
            {phase.microcycles.map((w: any) => (
              <div key={w.id} className="relative flex-shrink-0">
                {isCoach && (
                  <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                    <button onClick={() => duplicateWeek(w.id)} title="Duplicate" className="w-4 h-4 rounded-full bg-raised border border-edge text-[9px] text-faint hover:text-accent flex items-center justify-center">⧉</button>
                    <button onClick={() => deleteWeek(w.id)} title="Delete" className="w-4 h-4 rounded-full bg-raised border border-edge text-[9px] text-faint hover:text-red-400 flex items-center justify-center">✕</button>
                  </div>
                )}
                {isCoach ? (
                  <input
                    value={w.name || ""}
                    onFocus={() => setSelectedWeekId(w.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateWeekName(w.id, e.target.value)}
                    className={`min-w-[70px] rounded-lg border px-3 py-2 text-xs font-semibold text-center bg-transparent outline-none ${w.id === week?.id ? "border-accent bg-raised text-primary" : "border-edgesoft bg-void text-muted"}`}
                  />
                ) : (
                  <button
                    onClick={() => setSelectedWeekId(w.id)}
                    className={`min-w-[70px] rounded-lg border px-3 py-2 text-xs font-semibold ${w.id === week?.id ? "border-accent bg-raised text-primary" : "border-edgesoft bg-void text-muted"}`}
                  >
                    {w.name}
                  </button>
                )}
              </div>
            ))}
            {isCoach && (
              <button onClick={() => addWeek(phase.id)} className="text-xs text-accent underline flex-shrink-0 self-center">+ Add week</button>
            )}
          </div>
        </div>
      )}

      {/* Days */}
      {week && (
        <div className="bg-surface border border-edge rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="font-display text-xs uppercase tracking-wide text-muted">{phase.name} · {week.name} — Day by Day</div>
            {isCoach && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-faint">Week starts:</span>
                <input
                  type="date"
                  className={inputClass}
                  style={{ width: 140 }}
                  value={week.startDate ? week.startDate.slice(0, 10) : ""}
                  onChange={async (e) => {
                    await guard(async () => {
                      await api(`/api/programs/weeks/${week.id}`, { method: "PATCH", body: JSON.stringify({ startDate: e.target.value || null }) });
                      await load();
                    });
                  }}
                />
              </div>
            )}
          </div>
          {isCoach && (
            <p className="text-[11px] text-faint mb-2">Tip: drag an exercise (or superset block) by its ⠿ handle to reorder it within the day.</p>
          )}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {week.days.map((day: any) => {
              const blocks = buildBlocks(day);
              const dayDate = week.startDate
                ? new Date(new Date(week.startDate).getTime() + day.dayOfWeek * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : null;
              return (
                <div key={day.id} className="min-w-[230px] max-w-[250px] flex-shrink-0 bg-void border border-edgesoft rounded-lg p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xs font-bold text-accent uppercase">{day.label}</span>
                      {dayDate && <span className="text-[10px] text-faint">{dayDate}</span>}
                      {todayMatch?.dayId === day.id && (
                        <span className="text-[9px] bg-accent text-accenttext rounded px-1.5 py-0.5 font-bold uppercase">Today</span>
                      )}
                    </div>
                    {day.exercises.length > 0 && (
                      <button onClick={() => printDay(day, week.name, dayDate)} title="Print this day" className="text-[10px] text-faint hover:text-accent flex-shrink-0">🖨 Print</button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {day.exercises.length === 0 && <div className="text-faint text-xs text-center py-3">Rest day</div>}
                    {blocks.map((b: any, blockIdx: number) => (
                      <div
                        key={b.type === "single" ? b.ex.id : b.groupId}
                        draggable={isCoach}
                        onDragStart={() => setDragging({ dayId: day.id, blockIdx })}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleBlockDrop(day, blocks, blockIdx); }}
                        className={dragging && dragging.dayId === day.id && dragging.blockIdx === blockIdx ? "opacity-40" : ""}
                      >
                        {b.type === "single" ? (
                          <ExerciseCard
                            ex={b.ex}
                            isCoach={isCoach}
                            bestE1rm={bestE1rm}
                            library={library}
                            selected={!!selected[b.ex.id]}
                            onToggleSelect={() => setSelected((s) => ({ ...s, [b.ex.id]: !s[b.ex.id] }))}
                            onUpdate={(patch: any) => updateExercise(b.ex.id, patch)}
                            onDelete={() => deleteExercise(b.ex.id)}
                            onLogThis={() => logDay(day.id)}
                          />
                        ) : (
                          <div className="border border-dashed border-accent bg-accentsoft rounded-lg p-2" style={{ background: "rgba(126,200,227,0.08)" }}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-bold text-accent uppercase flex items-center gap-1">{isCoach && <span className="cursor-grab text-faint">⠿</span>}{b.label}</span>
                              {isCoach && <button onClick={() => ungroup(day.id, b.groupId)} className="text-faint hover:text-red-400 text-xs">✕</button>}
                            </div>
                            {b.members.map((m: any, i: number) => (
                              <div key={m.id} className="mb-1.5">
                                <div className="text-[10px] text-faint font-bold mb-0.5">{b.letter}{i + 1}</div>
                                <ExerciseCard
                                  ex={m}
                                  isCoach={isCoach}
                                  bestE1rm={bestE1rm}
                                  library={library}
                                  selected={!!selected[m.id]}
                                  onToggleSelect={() => setSelected((s) => ({ ...s, [m.id]: !s[m.id] }))}
                                  onUpdate={(patch: any) => updateExercise(m.id, patch)}
                                  onDelete={() => deleteExercise(m.id)}
                                  onLogThis={() => logDay(day.id)}
                                  hideDragHandle
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {isCoach && Object.values(selected).some(Boolean) && (
                    <div className="flex gap-1 mt-2">
                      <input className={inputClass} placeholder="Group label" value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} />
                      <button onClick={() => groupSelected(day.id)} className="text-xs bg-accent text-accenttext rounded px-2 flex-shrink-0">Group</button>
                    </div>
                  )}
                  {isCoach && (
                    <button onClick={() => addExercise(day.id)} className="w-full text-xs border border-edge rounded px-2 py-1.5 mt-2 text-muted hover:text-primary">+ Add exercise</button>
                  )}
                  {!isCoach && day.exercises.length > 0 && (
                    <button onClick={() => logDay(day.id)} className="w-full text-xs bg-accent text-accenttext font-semibold rounded px-2 py-1.5 mt-2">
                      Log this day
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ ex, isCoach, bestE1rm, library, selected, onToggleSelect, onUpdate, onDelete, onLogThis, hideDragHandle }: any) {
  const isTimeBased = ex.type === "timed" || ex.type === "sprint";
  const libItem = (library || []).find((it: any) => it.name === ex.exerciseName);
  const regressions: string[] = libItem?.regressions || [];
  const progressions: string[] = libItem?.progressions || [];
  if (!isCoach) {
    return (
      <div className="bg-surface border border-edgesoft rounded p-2">
        <div className="text-xs font-semibold flex items-center gap-1 flex-wrap">
          {ex.exerciseName}
          {ex.methodName && <span className="text-[10px] bg-raised text-faint rounded px-1">{ex.methodName}</span>}
          {ex.isWarmup && <span className="text-[10px] bg-raised text-faint rounded px-1">Warm-up</span>}
          {ex.isTest && <span className="text-[10px] bg-raised text-accent rounded px-1">Test</span>}
        </div>
        {hasSetDetails(ex) ? (
          <div className="text-[11px] text-muted mt-1 space-y-0.5">
            {ex.setDetails.map((s: any, i: number) => (
              <div key={i}>Set {i + 1}: {isTimeBased ? `${s.duration || ex.duration || "?"}s` : `${s.reps || ex.reps || "?"} reps`} — {setTargetLabel(ex, s, bestE1rm)}</div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-muted mt-1">
            {ex.sets || "?"}x{isTimeBased ? `${ex.duration || "?"}s` : ex.reps || "?"} — {targetLabel(ex, bestE1rm)}
          </div>
        )}
        {ex.notes && <div className="text-[11px] text-faint italic mt-1 whitespace-pre-wrap">📝 {ex.notes}</div>}
        <button onClick={onLogThis} className="text-[10px] text-accent underline mt-1">Log this</button>
      </div>
    );
  }

  const perSet = hasSetDetails(ex);
  const setDetails = perSet ? ex.setDetails : [];

  function toggleVaryBySet(on: boolean) {
    if (on) {
      const n = Number(ex.sets) || 1;
      const rows = Array.from({ length: n }, () => ({
        reps: ex.reps || "",
        duration: ex.duration || "",
        percentOfMax: ex.percentOfMax || "",
        weight: ex.weight || "",
      }));
      onUpdate({ setDetails: rows });
    } else {
      onUpdate({ setDetails: null });
    }
  }
  function updateSetRow(idx: number, patch: any) {
    const rows = (ex.setDetails || []).map((r: any, i: number) => (i === idx ? { ...r, ...patch } : r));
    onUpdate({ setDetails: rows, sets: rows.length });
  }
  function addSetRow() {
    const rows = [...(ex.setDetails || [])];
    const last = rows[rows.length - 1] || { reps: ex.reps || "", percentOfMax: ex.percentOfMax || "", weight: ex.weight || "" };
    rows.push({ ...last });
    onUpdate({ setDetails: rows, sets: rows.length });
  }
  function removeSetRow(idx: number) {
    const rows = (ex.setDetails || []).filter((_: any, i: number) => i !== idx);
    onUpdate({ setDetails: rows, sets: rows.length || null });
  }

  return (
    <div className="bg-surface border border-edgesoft rounded p-2 space-y-1">
      <div className="flex items-center gap-1">
        {!hideDragHandle && <span className="cursor-grab text-faint text-xs flex-shrink-0">⠿</span>}
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="flex-shrink-0" />
        <input
          className={inputClass}
          list="ex-lib"
          placeholder="Exercise"
          value={ex.exerciseName}
          onChange={(e) => onUpdate({ exerciseName: e.target.value })}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v) api("/api/library", { method: "POST", body: JSON.stringify({ name: v }) }).catch(() => {});
          }}
        />
        {(regressions.length > 0 || progressions.length > 0) && (
          <div className="flex gap-1">
            {regressions.length > 0 && (
              <select className={inputClass} style={{ fontSize: 10 }} value="" onChange={(e) => e.target.value && onUpdate({ exerciseName: e.target.value })}>
                <option value="">Regress to…</option>
                {regressions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {progressions.length > 0 && (
              <select className={inputClass} style={{ fontSize: 10 }} value="" onChange={(e) => e.target.value && onUpdate({ exerciseName: e.target.value })}>
                <option value="">Progress to…</option>
                {progressions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>
        )}
      </div>
      <input className={inputClass} placeholder="Method" value={ex.methodName || ""} onChange={(e) => onUpdate({ methodName: e.target.value })} />
      <select className={inputClass} value={ex.type} onChange={(e) => onUpdate({ type: e.target.value })}>
        <option value="weighted">Weighted</option>
        <option value="bodyweight">Bodyweight</option>
        <option value="banded">Banded</option>
        <option value="sprint">Sprint</option>
        <option value="timed">Timed</option>
      </select>
      {ex.type === "banded" && <input className={inputClass} placeholder="Band" value={ex.band || ""} onChange={(e) => onUpdate({ band: e.target.value })} />}
      {ex.type === "sprint" && <input className={inputClass} placeholder="Distance (yd)" value={ex.distance || ""} onChange={(e) => onUpdate({ distance: e.target.value })} />}
      <label className="flex items-center gap-1 text-[10px] text-faint">
        <input type="checkbox" checked={perSet} onChange={(e) => toggleVaryBySet(e.target.checked)} />
        Vary by set (ramping/wave loading)
      </label>
      {!perSet && (
        <>
          <div className="flex gap-1">
            <input className={inputClass} type="number" placeholder="Sets" value={ex.sets || ""} onChange={(e) => onUpdate({ sets: e.target.value })} />
            {!isTimeBased && <input className={inputClass} type="number" placeholder="Reps" value={ex.reps || ""} onChange={(e) => onUpdate({ reps: e.target.value })} />}
            {isTimeBased && <input className={inputClass} type="number" placeholder="Duration (sec)" value={ex.duration || ""} onChange={(e) => onUpdate({ duration: e.target.value })} />}
          </div>
          {ex.type === "weighted" && (
            <div className="flex gap-1 items-center">
              <input className={inputClass} type="number" placeholder="%1RM" value={ex.percentOfMax || ""} onChange={(e) => onUpdate({ percentOfMax: e.target.value })} />
              <span className="text-[10px] text-faint flex-shrink-0">or</span>
              <input className={inputClass} type="number" placeholder="Exact weight" value={ex.weight || ""} onChange={(e) => onUpdate({ weight: e.target.value })} />
            </div>
          )}
          {ex.type === "weighted" && <div className="text-[11px] bg-chalksoft text-chalk rounded px-2 py-1 text-center" style={{ background: "rgba(227,178,60,0.16)", color: "#E3B23C" }}>{targetLabel(ex, bestE1rm)}</div>}
        </>
      )}
      {perSet && (
        <div className="space-y-1 bg-void border border-edgesoft rounded p-1.5">
          {setDetails.map((s: any, i: number) => (
            <div key={i} className="flex gap-1 items-center">
              <span className="text-[9px] text-faint w-3 flex-shrink-0">{i + 1}</span>
              {!isTimeBased && (
                <input className={inputClass} type="number" placeholder="Reps" value={s.reps || ""} onChange={(e) => updateSetRow(i, { reps: e.target.value })} />
              )}
              {isTimeBased && (
                <input className={inputClass} type="number" placeholder="Sec" value={s.duration || ""} onChange={(e) => updateSetRow(i, { duration: e.target.value })} />
              )}
              {ex.type === "weighted" && (
                <>
                  <input className={inputClass} type="number" placeholder="%1RM" value={s.percentOfMax || ""} onChange={(e) => updateSetRow(i, { percentOfMax: e.target.value })} />
                  <input className={inputClass} type="number" placeholder="lb" value={s.weight || ""} onChange={(e) => updateSetRow(i, { weight: e.target.value })} />
                </>
              )}
              <button onClick={() => removeSetRow(i)} className="text-faint hover:text-red-400 text-xs flex-shrink-0" title="Remove set">✕</button>
            </div>
          ))}
          <button onClick={addSetRow} className="text-[10px] text-accent underline">+ Add set</button>
          {ex.type === "weighted" && setDetails.length > 0 && (
            <div className="text-[10px] text-faint bg-chalksoft text-chalk rounded px-2 py-1" style={{ background: "rgba(227,178,60,0.16)", color: "#E3B23C" }}>
              {setDetails.map((s: any) => setTargetLabel(ex, s, bestE1rm)).join(" · ")}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2 items-center flex-wrap text-[10px] text-faint">
        <label className="flex items-center gap-1"><input type="checkbox" checked={ex.isWarmup} onChange={(e) => onUpdate({ isWarmup: e.target.checked })} /> Warm-up</label>
        <label className="flex items-center gap-1 text-accent"><input type="checkbox" checked={ex.isTest} onChange={(e) => onUpdate({ isTest: e.target.checked })} /> Test</label>
      </div>
      <input className={inputClass} type="number" placeholder="Rest (sec)" value={ex.restSeconds || ""} onChange={(e) => onUpdate({ restSeconds: e.target.value })} />
      <textarea
        className={inputClass}
        placeholder="Coaching note for this exercise (cues, tempo, adjustments…)"
        value={ex.notes || ""}
        onChange={(e) => onUpdate({ notes: e.target.value })}
        rows={2}
        style={{ resize: "vertical" }}
      />
      <button onClick={onDelete} className="text-[10px] text-faint hover:text-red-400 w-full text-right">Delete</button>
    </div>
  );
}

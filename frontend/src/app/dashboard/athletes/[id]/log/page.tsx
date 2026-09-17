"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { computePRs } from "@/lib/prs";
import { TEST_PRESETS } from "@/lib/testPresets";

type SetRow = { weight: string; reps: string; duration: string };
const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none w-full";
const tinyCheck = "flex items-center gap-1.5 text-xs text-faint whitespace-nowrap";

export default function AthleteLogTab({ params }: { params: { id: string } }) {
  const athleteId = params.id;

  // Which kind of entry the form below is for. Workouts and tests are now
  // fully separate: a test entry is just a test type + one or more attempt
  // values, no weight/reps/duration involved at all.
  const [entryKind, setEntryKind] = useState<"workout" | "test">("workout");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Workout fields
  const [label, setLabel] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [type, setType] = useState("weighted");
  const [methodName, setMethodName] = useState("");
  const [band, setBand] = useState("");
  const [distance, setDistance] = useState("");
  const [resisted, setResisted] = useState(false);
  const [resistance, setResistance] = useState("");
  const [restSeconds, setRestSeconds] = useState("");
  const [isWarmup, setIsWarmup] = useState(false);
  const [sets, setSets] = useState<SetRow[]>([{ weight: "", reps: "", duration: "" }]);
  const [logs, setLogs] = useState<any[]>([]);

  // Test fields — pick a test type (a built-in preset, one from the team's
  // library, or a new custom one) and log one or more attempts of it in its
  // own unit (e.g. inches jumped, seconds run).
  const [testTypeLibrary, setTestTypeLibrary] = useState<any[]>([]);
  const [testOptionKey, setTestOptionKey] = useState(`preset:${TEST_PRESETS[0].key}`);
  const [testCustomName, setTestCustomName] = useState("");
  const [testCustomUnit, setTestCustomUnit] = useState("");
  const [testAttempts, setTestAttempts] = useState<string[]>([""]);
  const [testResults, setTestResults] = useState<any[]>([]);

  async function loadLogs() {
    setLogs(await api(`/api/workouts?athleteId=${athleteId}`));
  }
  async function loadTestResults() {
    setTestResults(await api(`/api/tests?athleteId=${athleteId}`));
  }
  async function loadTestTypeLibrary() {
    setTestTypeLibrary(await api("/api/test-types"));
  }
  useEffect(() => {
    loadLogs();
    loadTestResults();
    loadTestTypeLibrary();
    api("/api/library").then(setLibraryItems).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const testOptions = useMemo(() => {
    const presetLabels = new Set(TEST_PRESETS.map((p) => p.label));
    const fromLibrary = testTypeLibrary
      .filter((li) => !presetLabels.has(li.name))
      .map((li) => ({ key: `lib:${li.id}`, label: li.name, unit: li.unit || "" }));
    return [...TEST_PRESETS.map((p) => ({ key: `preset:${p.key}`, label: p.label, unit: p.unit })), ...fromLibrary];
  }, [testTypeLibrary]);

  const isCustomTest = testOptionKey === "custom";
  const activeTestOption = testOptions.find((o) => o.key === testOptionKey);
  const activeTestLabel = isCustomTest ? testCustomName.trim() : activeTestOption?.label || "";
  const activeTestUnit = isCustomTest ? testCustomUnit.trim() : activeTestOption?.unit || "";

  function updateSet(i: number, field: keyof SetRow, value: string) {
    setSets((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function addSet() {
    setSets((s) => [...s, { weight: "", reps: "", duration: "" }]);
  }
  function removeSet(i: number) {
    setSets((s) => s.filter((_, idx) => idx !== i));
  }
  function resetWorkoutForm() {
    setExerciseName("");
    setMethodName("");
    setBand("");
    setDistance("");
    setResisted(false);
    setResistance("");
    setRestSeconds("");
    setIsWarmup(false);
    setSets([{ weight: "", reps: "", duration: "" }]);
    setLabel("");
  }

  function updateAttempt(i: number, value: string) {
    setTestAttempts((a) => a.map((v, idx) => (idx === i ? value : v)));
  }
  function addAttempt() {
    setTestAttempts((a) => [...a, ""]);
  }
  function removeAttempt(i: number) {
    setTestAttempts((a) => a.filter((_, idx) => idx !== i));
  }
  function resetTestForm() {
    setTestOptionKey(`preset:${TEST_PRESETS[0].key}`);
    setTestCustomName("");
    setTestCustomUnit("");
    setTestAttempts([""]);
  }

  async function submitWorkout(e: React.FormEvent) {
    e.preventDefault();
    let cleanSets: any[] = [];
    if (type === "weighted") cleanSets = sets.filter((s) => Number(s.weight) > 0 && Number(s.reps) > 0).map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) }));
    else if (type === "bodyweight" || type === "banded") cleanSets = sets.filter((s) => Number(s.reps) > 0).map((s) => ({ reps: Number(s.reps) }));
    else cleanSets = sets.filter((s) => Number(s.duration) > 0).map((s) => ({ duration: Number(s.duration) }));
    if (!exerciseName.trim() || cleanSets.length === 0) return;

    await api("/api/workouts", {
      method: "POST",
      body: JSON.stringify({
        athleteId, date, label: label.trim() || undefined, exerciseName: exerciseName.trim(), type,
        methodName: methodName.trim() || undefined,
        band: type === "banded" ? band.trim() : undefined,
        distance: type === "sprint" ? distance.trim() : undefined,
        resisted: type === "sprint" ? resisted : undefined,
        resistance: type === "sprint" && resisted ? resistance.trim() : undefined,
        restSeconds: restSeconds.trim() || undefined,
        isWarmup, isTest: false, sets: cleanSets,
      }),
    });
    resetWorkoutForm();
    loadLogs();
  }

  async function submitTest(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTestLabel) return;
    const validAttempts = testAttempts.map((a) => a.trim()).filter((a) => a !== "" && !Number.isNaN(Number(a)));
    if (validAttempts.length === 0) return;

    if (isCustomTest) {
      // Save it to the team's test type library so it's a normal dropdown
      // option everywhere (Log tab and Testing tab) from now on.
      await api("/api/test-types", { method: "POST", body: JSON.stringify({ name: activeTestLabel, unit: activeTestUnit }) });
    }

    for (const value of validAttempts) {
      await api("/api/tests", {
        method: "POST",
        body: JSON.stringify({ athleteId, testType: activeTestLabel, unit: activeTestUnit, date, value: Number(value) }),
      });
    }

    resetTestForm();
    loadTestResults();
    if (isCustomTest) loadTestTypeLibrary();
  }

  const isTimeBased = type === "timed" || type === "sprint";
  const { prMap } = useMemo(() => computePRs(logs), [logs]);

  async function deleteLog(id: string) {
    if (!confirm("Delete this logged workout? This can't be undone.")) return;
    await api(`/api/workouts/${id}`, { method: "DELETE" });
    loadLogs();
  }
  async function deleteTestResult(id: string) {
    if (!confirm("Delete this test result? This can't be undone.")) return;
    await api(`/api/tests/${id}`, { method: "DELETE" });
    loadTestResults();
  }

  const tabBtn = (active: boolean) =>
    "text-sm font-semibold rounded px-4 py-2 transition-colors " +
    (active ? "bg-accent text-accenttext" : "bg-raised text-muted hover:text-primary");

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        <button type="button" onClick={() => setEntryKind("workout")} className={tabBtn(entryKind === "workout")}>
          Log a Workout
        </button>
        <button type="button" onClick={() => setEntryKind("test")} className={tabBtn(entryKind === "test")}>
          Log a Test
        </button>
      </div>

      {entryKind === "workout" && (
        <form onSubmit={submitWorkout} className="bg-surface border border-edge rounded-lg p-4 max-w-2xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            <input className={inputClass} placeholder="Session label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputClass}
              list="library-exercises"
              placeholder="Exercise name"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              onBlur={(e) => e.target.value.trim() && api("/api/library", { method: "POST", body: JSON.stringify({ name: e.target.value.trim() }) })}
            />
            <datalist id="library-exercises">
              {libraryItems.map((it) => (
                <option key={it.id} value={it.name} />
              ))}
            </datalist>
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="weighted">Weighted</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="banded">Banded</option>
              <option value="sprint">Sprint</option>
              <option value="timed">Timed</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input className={inputClass} style={{ maxWidth: 220 }} placeholder="Training method" value={methodName} onChange={(e) => setMethodName(e.target.value)} />
            {type === "banded" && <input className={inputClass} style={{ maxWidth: 160 }} placeholder="Band" value={band} onChange={(e) => setBand(e.target.value)} />}
            {type === "sprint" && (
              <>
                <input className={inputClass} style={{ maxWidth: 140 }} placeholder="Distance (yd)" value={distance} onChange={(e) => setDistance(e.target.value)} />
                <label className={tinyCheck}><input type="checkbox" checked={resisted} onChange={(e) => setResisted(e.target.checked)} /> Resisted</label>
                {resisted && <input className={inputClass} style={{ maxWidth: 180 }} placeholder="Resistance" value={resistance} onChange={(e) => setResistance(e.target.value)} />}
              </>
            )}
            <input className={inputClass} style={{ maxWidth: 130 }} placeholder="Rest (sec)" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
            <label className={tinyCheck}><input type="checkbox" checked={isWarmup} onChange={(e) => setIsWarmup(e.target.checked)} /> Warm-up</label>
          </div>

          <div className="space-y-2">
            {sets.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-faint w-5">{i + 1}</span>
                {type === "weighted" && (
                  <>
                    <input className={inputClass} type="number" step="any" placeholder="Weight (lb)" value={s.weight} onChange={(e) => updateSet(i, "weight", e.target.value)} />
                    <input className={inputClass} type="number" step="any" placeholder="Reps" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)} />
                  </>
                )}
                {(type === "bodyweight" || type === "banded") && (
                  <input className={inputClass} type="number" step="any" placeholder="Reps" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)} />
                )}
                {isTimeBased && <input className={inputClass} type="number" step="any" placeholder="Seconds" value={s.duration} onChange={(e) => updateSet(i, "duration", e.target.value)} />}
                {sets.length > 1 && <button type="button" onClick={() => removeSet(i)} className="text-faint hover:text-red-400 text-xs flex-shrink-0">✕</button>}
              </div>
            ))}
            <button type="button" onClick={addSet} className="text-xs text-accent underline">+ Add set</button>
          </div>
          <button className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors">Save session</button>
        </form>
      )}

      {entryKind === "test" && (
        <form onSubmit={submitTest} className="bg-surface border border-edge rounded-lg p-4 max-w-2xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            <select className={inputClass} value={testOptionKey} onChange={(e) => setTestOptionKey(e.target.value)}>
              {testOptions.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </div>
          {isCustomTest && (
            <div className="grid grid-cols-2 gap-3">
              <input className={inputClass} placeholder="Test name" value={testCustomName} onChange={(e) => setTestCustomName(e.target.value)} />
              <input className={inputClass} placeholder="Unit (in / sec / lb …)" value={testCustomUnit} onChange={(e) => setTestCustomUnit(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <div className="text-xs text-faint">
              {activeTestLabel ? `${activeTestLabel} attempts` : "Attempts"}
              {activeTestUnit ? ` (${activeTestUnit})` : ""} — add one row per attempt or set.
            </div>
            {testAttempts.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-faint w-5">{i + 1}</span>
                <input
                  className={inputClass}
                  type="number"
                  step="any"
                  placeholder={`Value${activeTestUnit ? ` (${activeTestUnit})` : ""}`}
                  value={v}
                  onChange={(e) => updateAttempt(i, e.target.value)}
                />
                {testAttempts.length > 1 && (
                  <button type="button" onClick={() => removeAttempt(i)} className="text-faint hover:text-red-400 text-xs flex-shrink-0">✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addAttempt} className="text-xs text-accent underline">+ Add another attempt</button>
          </div>
          {isCustomTest && (
            <p className="text-xs text-faint">Saving a custom test type adds it to your team's list, so it's a normal option next time — here and on the Testing tab.</p>
          )}
          <button className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40" disabled={!activeTestLabel}>
            Save test result{testAttempts.filter((a) => a.trim() !== "").length > 1 ? "s" : ""}
          </button>
        </form>
      )}

      <div>
        <h2 className="font-display text-lg font-semibold mb-2">History</h2>
        <ul className="space-y-2">
          {logs.map((l) => {
            let summary = "";
            if (l.type === "weighted" || !l.type) {
              const top = Math.max(...(l.sets || []).map((s: any) => s.weight || 0));
              summary = `top ${top} lb · vol ${l.volumeLoad?.toLocaleString()} lb·reps`;
            } else if (l.type === "bodyweight" || l.type === "banded") {
              const best = Math.max(...(l.sets || []).map((s: any) => s.reps || 0));
              summary = `best ${best} reps`;
            } else {
              const durations = (l.sets || []).map((s: any) => s.duration || 0);
              summary = l.type === "sprint" ? `fastest ${Math.min(...durations)}s` : `best ${Math.max(...durations)}s`;
            }
            return (
              <li key={l.id} className="bg-surface border border-edge rounded p-3 text-sm flex justify-between items-center">
                <span>
                  {new Date(l.date).toLocaleDateString()}
                  {l.label ? ` — ${l.label}` : ""} — <span className="font-medium">{l.exerciseName}</span>
                  {l.isWarmup && <span className="ml-2 text-xs bg-raised text-faint rounded px-1.5 py-0.5">Warm-up</span>}
                  {l.isTest && <span className="ml-2 text-xs bg-raised text-accent rounded px-1.5 py-0.5">Test</span>}
                  {prMap[l.id]?.weightPR && (
                    <span className="ml-2 text-xs bg-chalk text-accenttext font-bold rounded px-1.5 py-0.5 tracking-wide">PR</span>
                  )}
                </span>
                <span className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-mono text-chalk text-xs">{summary}</span>
                  <button type="button" onClick={() => deleteLog(l.id)} className="text-faint hover:text-red-400 text-xs" title="Delete this logged workout">
                    ✕
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        {logs.length === 0 && <p className="text-faint text-sm">Nothing logged yet.</p>}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-2">Recent Test Results</h2>
        <ul className="space-y-2">
          {testResults.map((t) => (
            <li key={t.id} className="bg-surface border border-edge rounded p-3 text-sm flex justify-between items-center">
              <span>
                {new Date(t.date).toLocaleDateString()} — <span className="font-medium">{t.testType}</span>
              </span>
              <span className="flex items-center gap-3 flex-shrink-0">
                <span className="font-mono text-chalk text-xs">{t.value}{t.unit ? ` ${t.unit}` : ""}</span>
                <button type="button" onClick={() => deleteTestResult(t.id)} className="text-faint hover:text-red-400 text-xs" title="Delete this test result">
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
        {testResults.length === 0 && <p className="text-faint text-sm">No test results yet.</p>}
      </div>
    </div>
  );
}

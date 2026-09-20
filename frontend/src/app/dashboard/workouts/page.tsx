"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { TEST_PRESETS } from "@/lib/testPresets";
import { computePRs } from "@/lib/prs";

type SetRow = { weight: string; reps: string; duration: string };

// useSearchParams() requires a <Suspense> boundary around it (Next.js
// build-time requirement), so the default export just supplies that and the
// real page lives in WorkoutsPageInner.
export default function WorkoutsPage() {
  return (
    <Suspense fallback={<p className="text-faint text-sm">Loading…</p>}>
      <WorkoutsPageInner />
    </Suspense>
  );
}

function WorkoutsPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [athleteId, setAthleteId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Which kind of entry the form below is for. Workouts and tests are now
  // fully separate: a test entry is just a test type + one or more attempt
  // values, no weight/reps/duration involved at all.
  const [entryKind, setEntryKind] = useState<"workout" | "test">("workout");

  // Workout fields
  const [label, setLabel] = useState("");
  const [exerciseName, setExerciseName] = useState("");
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
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [appliedTestPrefill, setAppliedTestPrefill] = useState(false);

  // Every exercise's current all-time best, kept by the backend — shown
  // next to the exercise as it's picked, and used to flag a save as a new
  // PR the instant it comes back, not just once History re-renders.
  const [bests, setBests] = useState<any[]>([]);
  const [prBanner, setPrBanner] = useState("");

  const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none w-full";
  const tinyCheck = "flex items-center gap-1.5 text-xs text-faint whitespace-nowrap";

  const testOptions = useMemo(() => {
    const presetLabels = new Set(TEST_PRESETS.map((p) => p.label));
    const fromLibrary = testTypeLibrary
      .filter((li) => !presetLabels.has(li.name))
      .map((li) => ({ key: `lib:${li.id}`, label: li.name, unit: li.unit || "" }));
    return [...TEST_PRESETS.map((p) => ({ key: `preset:${p.key}`, label: p.label, unit: p.unit })), ...fromLibrary];
  }, [testTypeLibrary]);

  // A "Log this" / "Log this day" link from a plan can arrive as either a
  // normal exercise (prefill the workout form) or, when the coach marked
  // that prescribed exercise as a Test, as ?exercise=<name>&isTest=1&sets=<n>
  // — in which case we open straight into the Log a Test tab with that test
  // type already picked and one attempt row per prescribed set.
  useEffect(() => {
    const prefillExercise = searchParams.get("exercise");
    const prefillIsTest = searchParams.get("isTest") === "1";
    if (prefillExercise && !prefillIsTest) {
      setExerciseName(prefillExercise);
      const prefillMethod = searchParams.get("method");
      const prefillRest = searchParams.get("rest");
      if (prefillMethod) setMethodName(prefillMethod);
      if (prefillRest) setRestSeconds(prefillRest);
    }
  }, [searchParams]);

  useEffect(() => {
    if (appliedTestPrefill || !libraryLoaded) return;
    const prefillExercise = searchParams.get("exercise");
    const prefillIsTest = searchParams.get("isTest") === "1";
    if (!prefillExercise || !prefillIsTest) return;

    setEntryKind("test");
    const match = testOptions.find((o) => o.label.toLowerCase() === prefillExercise.toLowerCase());
    if (match) {
      setTestOptionKey(match.key);
    } else {
      setTestOptionKey("custom");
      setTestCustomName(prefillExercise);
    }
    const prefillSets = Number(searchParams.get("sets") || "0");
    if (prefillSets > 1) setTestAttempts(Array.from({ length: prefillSets }, () => ""));
    setAppliedTestPrefill(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testOptions, libraryLoaded, appliedTestPrefill, searchParams]);

  useEffect(() => {
    if (user?.role === "COACH") api("/api/teams/me/athletes").then(setAthletes).catch(console.error);
    loadLogs();
    loadTestResults();
    loadTestTypeLibrary().finally(() => setLibraryLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // A coach with no athlete picked yet has nobody's bests to show; an
  // athlete always has their own.
  useEffect(() => {
    if (user?.role === "ATHLETE" || athleteId) loadBests();
    else setBests([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId, user]);

  async function loadLogs() {
    const data = await api("/api/workouts" + (athleteId ? `?athleteId=${athleteId}` : ""));
    setLogs(data);
  }
  async function loadTestResults() {
    const data = await api("/api/tests" + (athleteId ? `?athleteId=${athleteId}` : ""));
    setTestResults(data);
  }
  async function loadTestTypeLibrary() {
    setTestTypeLibrary(await api("/api/test-types"));
  }
  async function loadBests() {
    setBests(await api("/api/workouts/bests" + (athleteId ? `?athleteId=${athleteId}` : "")));
  }

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

    const savedExerciseName = exerciseName.trim();
    const saved = await api("/api/workouts", {
      method: "POST",
      body: JSON.stringify({
        athleteId: athleteId || undefined,
        date,
        label: label.trim() || undefined,
        exerciseName: savedExerciseName,
        type,
        methodName: methodName.trim() || undefined,
        band: type === "banded" ? band.trim() : undefined,
        distance: type === "sprint" ? distance.trim() : undefined,
        resisted: type === "sprint" ? resisted : undefined,
        resistance: type === "sprint" && resisted ? resistance.trim() : undefined,
        restSeconds: restSeconds.trim() || undefined,
        isWarmup,
        isTest: false,
        sets: cleanSets,
      }),
    });
    resetWorkoutForm();
    loadLogs();
    // Nobody's bests to reload if a coach hasn't picked an athlete yet (they
    // just logged it under their own account instead — see targetAthleteId
    // in createWorkoutLog).
    const canLoadBests = isAthlete || !!athleteId;
    if (saved.isWeightPR || saved.isE1rmPR) {
      const weightBit = saved.isWeightPR ? `${Math.round(saved.bestWeight)} lb` : "";
      setPrBanner(`New PR on ${savedExerciseName}!${weightBit ? ` ${weightBit}` : ""}`);
      if (canLoadBests) loadBests();
      setTimeout(() => setPrBanner(""), 5000);
    } else if (saved.bestWeight !== undefined && canLoadBests) {
      loadBests();
    }
  }

  async function submitTest(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTestLabel) return;
    const validAttempts = testAttempts.map((a) => a.trim()).filter((a) => a !== "" && !Number.isNaN(Number(a)));
    if (validAttempts.length === 0) return;

    if (isCustomTest) {
      await api("/api/test-types", { method: "POST", body: JSON.stringify({ name: activeTestLabel, unit: activeTestUnit }) });
    }

    for (const value of validAttempts) {
      await api("/api/tests", {
        method: "POST",
        body: JSON.stringify({ athleteId: athleteId || undefined, testType: activeTestLabel, unit: activeTestUnit, date, value: Number(value) }),
      });
    }

    resetTestForm();
    loadTestResults();
    if (isCustomTest) loadTestTypeLibrary();
  }

  const isTimeBased = type === "timed" || type === "sprint";
  const { prMap } = useMemo(() => computePRs(logs), [logs]);
  const currentBest = useMemo(
    () => bests.find((b) => b.exerciseName.toLowerCase() === exerciseName.trim().toLowerCase()),
    [bests, exerciseName]
  );
  // Athletes log their performance (sets/reps/weight/duration) against
  // whatever the coach prescribed — they don't get to change what
  // exercise, method, or rest was prescribed, or invent a session label.
  // Those come in prefilled from "Log this" on the plan; if nothing came
  // through, there's simply nothing to log against yet.
  const isAthlete = user?.role === "ATHLETE";

  async function deleteLog(id: string) {
    if (!confirm("Delete this logged workout? This can't be undone.")) return;
    await api(`/api/workouts/${id}`, { method: "DELETE" });
    loadLogs();
    // Deleting a log can change (or clear) that exercise's recorded best —
    // but there's nobody's bests to reload if a coach hasn't picked an
    // athlete yet (the bests endpoint requires one for a coach).
    if (isAthlete || athleteId) loadBests();
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
      <div>
        <h1 className="font-display text-xl font-semibold mb-4">Log a Workout or Test</h1>

        {prBanner && (
          <p className="bg-chalk text-accenttext font-semibold text-sm rounded px-3 py-2 mb-3 max-w-2xl">{prBanner}</p>
        )}

        {user?.role === "COACH" && (
          <select className={inputClass + " max-w-2xl mb-3"} value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
            <option value="">Select athlete…</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        <div className="flex gap-2 mb-3">
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
              {!isAthlete && (
                <input className={inputClass} placeholder="Session label (optional, e.g. AM Lift)" value={label} onChange={(e) => setLabel(e.target.value)} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {isAthlete ? (
                <div className={inputClass + " bg-raised cursor-not-allowed"}>
                  {exerciseName || <span className="text-faint">Use "Log this" on your plan to pick an exercise</span>}
                </div>
              ) : (
                <input className={inputClass} placeholder="Exercise name" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} />
              )}
              <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="weighted">Weighted</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="banded">Banded</option>
                <option value="sprint">Sprint</option>
                <option value="timed">Timed</option>
              </select>
            </div>
            {type === "weighted" && currentBest && (
              <p className="text-xs text-faint -mt-1">
                Current best on {exerciseName.trim()}: <span className="text-chalk font-mono">{Math.round(currentBest.bestWeight)} lb</span>
              </p>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              {isAthlete ? (
                methodName && <span className="text-xs text-faint">Method: <span className="text-muted">{methodName}</span></span>
              ) : (
                <input className={inputClass} style={{ maxWidth: 220 }} placeholder="Training method (optional)" value={methodName} onChange={(e) => setMethodName(e.target.value)} />
              )}
              {type === "banded" && <input className={inputClass} style={{ maxWidth: 160 }} placeholder="Band (e.g. Green)" value={band} onChange={(e) => setBand(e.target.value)} />}
              {type === "sprint" && (
                <>
                  <input className={inputClass} style={{ maxWidth: 140 }} placeholder="Distance (yd)" value={distance} onChange={(e) => setDistance(e.target.value)} />
                  <label className={tinyCheck}><input type="checkbox" checked={resisted} onChange={(e) => setResisted(e.target.checked)} /> Resisted</label>
                  {resisted && <input className={inputClass} style={{ maxWidth: 180 }} placeholder="Resistance (e.g. 20lb sled)" value={resistance} onChange={(e) => setResistance(e.target.value)} />}
                </>
              )}
              {isAthlete ? (
                restSeconds && <span className="text-xs text-faint">Rest: <span className="text-muted">{restSeconds}s</span></span>
              ) : (
                <input className={inputClass} style={{ maxWidth: 130 }} placeholder="Rest (sec)" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
              )}
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
                  {isTimeBased && (
                    <input className={inputClass} type="number" step="any" placeholder="Seconds" value={s.duration} onChange={(e) => updateSet(i, "duration", e.target.value)} />
                  )}
                  {sets.length > 1 && (
                    <button type="button" onClick={() => removeSet(i)} className="text-faint hover:text-red-400 text-xs flex-shrink-0">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addSet} className="text-xs text-accent underline">+ Add set</button>
            </div>

            <button
              className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40"
              disabled={isAthlete && !exerciseName.trim()}
            >
              Save session
            </button>
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
      </div>

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
              <li key={l.id} className="bg-surface border border-edge rounded p-3 text-sm">
                <div className="flex justify-between items-center">
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
                </div>
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

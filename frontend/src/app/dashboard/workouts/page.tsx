"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { TEST_PRESETS } from "@/lib/testPresets";

type SetRow = { weight: string; reps: string; duration: string };

export default function WorkoutsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [athleteId, setAthleteId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
  const [isTest, setIsTest] = useState(false);
  const [sets, setSets] = useState<SetRow[]>([{ weight: "", reps: "", duration: "" }]);

  const [logs, setLogs] = useState<any[]>([]);

  // "Mark as Test" details — same preset/unit picker as the coach's per-athlete
  // Log tab and the Testing tab: either derive the test value from the
  // weight/reps/time logged above, or pick a test type and type its value
  // directly in its own unit (e.g. inches jumped for a Vertical Jump).
  const [testMode, setTestMode] = useState<"auto" | "direct">("auto");
  const [testTypeLibrary, setTestTypeLibrary] = useState<any[]>([]);
  const [testOptionKey, setTestOptionKey] = useState(`preset:${TEST_PRESETS[0].key}`);
  const [testCustomName, setTestCustomName] = useState("");
  const [testCustomUnit, setTestCustomUnit] = useState("");
  const [testValue, setTestValue] = useState("");

  const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none w-full";
  const tinyCheck = "flex items-center gap-1.5 text-xs text-faint whitespace-nowrap";

  useEffect(() => {
    const prefill = searchParams.get("exercise");
    if (prefill) setExerciseName(prefill);
  }, [searchParams]);

  useEffect(() => {
    if (user?.role === "COACH") api("/api/teams/me/athletes").then(setAthletes).catch(console.error);
    loadLogs();
    loadTestTypeLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadLogs() {
    const data = await api("/api/workouts" + (athleteId ? `?athleteId=${athleteId}` : ""));
    setLogs(data);
  }
  async function loadTestTypeLibrary() {
    setTestTypeLibrary(await api("/api/test-types"));
  }

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

  function resetForm() {
    setExerciseName("");
    setMethodName("");
    setBand("");
    setDistance("");
    setResisted(false);
    setResistance("");
    setRestSeconds("");
    setIsWarmup(false);
    setIsTest(false);
    setSets([{ weight: "", reps: "", duration: "" }]);
    setLabel("");
    setTestMode("auto");
    setTestOptionKey(`preset:${TEST_PRESETS[0].key}`);
    setTestCustomName("");
    setTestCustomUnit("");
    setTestValue("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let cleanSets: any[] = [];
    if (type === "weighted") cleanSets = sets.filter((s) => Number(s.weight) > 0 && Number(s.reps) > 0).map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) }));
    else if (type === "bodyweight" || type === "banded") cleanSets = sets.filter((s) => Number(s.reps) > 0).map((s) => ({ reps: Number(s.reps) }));
    else cleanSets = sets.filter((s) => Number(s.duration) > 0).map((s) => ({ duration: Number(s.duration) }));
    if (!exerciseName.trim() || cleanSets.length === 0) return;

    const useDirectTest = isTest && testMode === "direct";
    if (useDirectTest && (!activeTestLabel || !testValue)) return;

    if (useDirectTest && isCustomTest) {
      await api("/api/test-types", { method: "POST", body: JSON.stringify({ name: activeTestLabel, unit: activeTestUnit }) });
    }

    await api("/api/workouts", {
      method: "POST",
      body: JSON.stringify({
        athleteId: athleteId || undefined,
        date,
        label: label.trim() || undefined,
        exerciseName: exerciseName.trim(),
        type,
        methodName: methodName.trim() || undefined,
        band: type === "banded" ? band.trim() : undefined,
        distance: type === "sprint" ? distance.trim() : undefined,
        resisted: type === "sprint" ? resisted : undefined,
        resistance: type === "sprint" && resisted ? resistance.trim() : undefined,
        restSeconds: restSeconds.trim() || undefined,
        isWarmup,
        isTest,
        sets: cleanSets,
        ...(useDirectTest ? { testType: activeTestLabel, testUnit: activeTestUnit, testValue: Number(testValue) } : {}),
      }),
    });
    resetForm();
    loadLogs();
    if (useDirectTest && isCustomTest) loadTestTypeLibrary();
  }

  const isTimeBased = type === "timed" || type === "sprint";

  async function deleteLog(id: string) {
    if (!confirm("Delete this logged workout? This can't be undone.")) return;
    await api(`/api/workouts/${id}`, { method: "DELETE" });
    loadLogs();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold mb-4">Log a Workout</h1>
        <form onSubmit={submit} className="bg-surface border border-edge rounded-lg p-4 max-w-2xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            <input className={inputClass} placeholder="Session label (optional, e.g. AM Lift)" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          {user?.role === "COACH" && (
            <select className={inputClass} value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
              <option value="">Select athlete…</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Exercise name" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} />
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="weighted">Weighted</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="banded">Banded</option>
              <option value="sprint">Sprint</option>
              <option value="timed">Timed</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <input className={inputClass} style={{ maxWidth: 220 }} placeholder="Training method (optional)" value={methodName} onChange={(e) => setMethodName(e.target.value)} />
            {type === "banded" && <input className={inputClass} style={{ maxWidth: 160 }} placeholder="Band (e.g. Green)" value={band} onChange={(e) => setBand(e.target.value)} />}
            {type === "sprint" && (
              <>
                <input className={inputClass} style={{ maxWidth: 140 }} placeholder="Distance (yd)" value={distance} onChange={(e) => setDistance(e.target.value)} />
                <label className={tinyCheck}><input type="checkbox" checked={resisted} onChange={(e) => setResisted(e.target.checked)} /> Resisted</label>
                {resisted && <input className={inputClass} style={{ maxWidth: 180 }} placeholder="Resistance (e.g. 20lb sled)" value={resistance} onChange={(e) => setResistance(e.target.value)} />}
              </>
            )}
            <input className={inputClass} style={{ maxWidth: 130 }} placeholder="Rest (sec)" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
            <label className={tinyCheck}><input type="checkbox" checked={isWarmup} onChange={(e) => setIsWarmup(e.target.checked)} /> Warm-up</label>
            <label className={tinyCheck + " text-accent"}><input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} /> Mark as Test</label>
          </div>

          {isTest && (
            <div className="bg-raised border border-edge rounded p-3 space-y-2">
              <div className="text-xs text-faint">How should this test be recorded?</div>
              <select className={inputClass} value={testMode} onChange={(e) => setTestMode(e.target.value as "auto" | "direct")}>
                <option value="auto">Use the weight/reps/time I logged above</option>
                <option value="direct">Pick a test type and enter a value directly</option>
              </select>
              {testMode === "direct" && (
                <div className="grid grid-cols-2 gap-2">
                  <select className={inputClass} value={testOptionKey} onChange={(e) => setTestOptionKey(e.target.value)}>
                    {testOptions.map((o) => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                    <option value="custom">Custom…</option>
                  </select>
                  {isCustomTest ? (
                    <input className={inputClass} placeholder="Test name" value={testCustomName} onChange={(e) => setTestCustomName(e.target.value)} />
                  ) : (
                    <input
                      className={inputClass}
                      type="number"
                      step="any"
                      placeholder={`Value${activeTestUnit ? ` (${activeTestUnit})` : ""}`}
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                    />
                  )}
                  {isCustomTest && (
                    <>
                      <input className={inputClass} placeholder="Unit (in / sec / lb …)" value={testCustomUnit} onChange={(e) => setTestCustomUnit(e.target.value)} />
                      <input
                        className={inputClass}
                        type="number"
                        step="any"
                        placeholder={`Value${activeTestUnit ? ` (${activeTestUnit})` : ""}`}
                        value={testValue}
                        onChange={(e) => setTestValue(e.target.value)}
                      />
                    </>
                  )}
                </div>
              )}
              {testMode === "direct" && isCustomTest && (
                <p className="text-xs text-faint">Saving a custom test type adds it to your team's list, so it's a normal option next time — here and on the Testing tab.</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {sets.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-faint w-5">{i + 1}</span>
                {type === "weighted" && (
                  <>
                    <input className={inputClass} type="number" placeholder="Weight (lb)" value={s.weight} onChange={(e) => updateSet(i, "weight", e.target.value)} />
                    <input className={inputClass} type="number" placeholder="Reps" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)} />
                  </>
                )}
                {(type === "bodyweight" || type === "banded") && (
                  <input className={inputClass} type="number" placeholder="Reps" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)} />
                )}
                {isTimeBased && (
                  <input className={inputClass} type="number" placeholder="Seconds" value={s.duration} onChange={(e) => updateSet(i, "duration", e.target.value)} />
                )}
                {sets.length > 1 && (
                  <button type="button" onClick={() => removeSet(i)} className="text-faint hover:text-red-400 text-xs flex-shrink-0">✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addSet} className="text-xs text-accent underline">+ Add set</button>
          </div>

          <button className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors">Save session</button>
        </form>
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
    </div>
  );
}

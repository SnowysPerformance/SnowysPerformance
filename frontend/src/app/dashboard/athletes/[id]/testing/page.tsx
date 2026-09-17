"use client";
import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { TEST_PRESETS } from "@/lib/testPresets";

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none";

export default function AthleteTestingTab({ params }: { params: { id: string } }) {
  const athleteId = params.id;
  const [results, setResults] = useState<any[]>([]);
  const [libraryTypes, setLibraryTypes] = useState<any[]>([]);

  const [optionKey, setOptionKey] = useState(`preset:${TEST_PRESETS[0].key}`);
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadResults() {
    setResults(await api(`/api/tests?athleteId=${athleteId}`));
  }
  async function loadLibrary() {
    setLibraryTypes(await api("/api/test-types"));
  }
  useEffect(() => {
    loadResults();
    loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  // Quick-entry options: built-in presets first, then any team-defined
  // custom test types (added the first time someone logs a "Custom…" one),
  // deduped by name so a saved custom type never shadows a matching preset.
  const options = useMemo(() => {
    const presetLabels = new Set(TEST_PRESETS.map((p) => p.label));
    const fromLibrary = libraryTypes
      .filter((li) => !presetLabels.has(li.name))
      .map((li) => ({ key: `lib:${li.id}`, label: li.name, unit: li.unit || "" }));
    return [...TEST_PRESETS.map((p) => ({ key: `preset:${p.key}`, label: p.label, unit: p.unit })), ...fromLibrary];
  }, [libraryTypes]);

  const isCustom = optionKey === "custom";
  const activeOption = options.find((o) => o.key === optionKey);
  const activeLabel = isCustom ? customName.trim() : activeOption?.label || "";
  const activeUnit = isCustom ? customUnit.trim() : activeOption?.unit || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeLabel || !value) return;
    setSaving(true);
    try {
      if (isCustom) {
        // Persist it to the team's test type library so it's a normal
        // dropdown option for everyone from now on, not just this once.
        await api("/api/test-types", { method: "POST", body: JSON.stringify({ name: activeLabel, unit: activeUnit }) });
      }
      await api("/api/tests", { method: "POST", body: JSON.stringify({ athleteId, testType: activeLabel, value: Number(value), unit: activeUnit, date }) });
      setValue("");
      if (isCustom) {
        setCustomName("");
        setCustomUnit("");
      }
      await Promise.all([loadResults(), loadLibrary()]);
    } finally {
      setSaving(false);
    }
  }

  // Testing Progression chart — a dedicated trend chart per test type,
  // separate from the workout Progress tab. Falls back to including any
  // test type that's actually been logged, even if it's not a preset or
  // saved library item (e.g. older data).
  const testTypes = useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((o) => map.set(o.label, o.unit));
    results.forEach((r) => {
      if (!map.has(r.testType)) map.set(r.testType, r.unit || "");
    });
    return Array.from(map.entries());
  }, [options, results]);

  const [selectedType, setSelectedType] = useState("");
  useEffect(() => {
    if (!testTypes.some(([label]) => label === selectedType)) setSelectedType(testTypes[0]?.[0] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testTypes.map((t) => t[0]).join("|")]);

  const series = useMemo(
    () =>
      results
        .filter((r) => r.testType === selectedType)
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((r) => ({ date: new Date(r.date).toLocaleDateString(), value: r.value })),
    [results, selectedType]
  );
  const unitFor = testTypes.find(([label]) => label === selectedType)?.[1] || "";

  const rows = results.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="bg-surface border border-edge rounded-lg p-4 max-w-2xl space-y-3">
        <div className="font-display text-sm uppercase tracking-wide text-muted">Log a Test Result</div>
        <div className="grid grid-cols-2 gap-3">
          <select className={inputClass} value={optionKey} onChange={(e) => setOptionKey(e.target.value)}>
            {options.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {isCustom && (
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Test name (e.g. Pro Agility)" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            <input className={inputClass} placeholder="Unit (sec / in / lb …)" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            className={inputClass}
            style={{ maxWidth: 180 }}
            type="number"
            placeholder={`Value${activeUnit ? ` (${activeUnit})` : ""}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40" disabled={!activeLabel || !value || saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {isCustom && <p className="text-xs text-faint">Saving a custom test type adds it to your team's list, so it shows up as a normal option from now on.</p>}
      </form>

      {testTypes.length > 0 && (
        <div className="bg-surface border border-edge rounded p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="font-display text-sm uppercase tracking-wide text-muted">Testing Progression</div>
            <select className={inputClass} style={{ width: 200 }} value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              {testTypes.map(([label]) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>
          {series.length === 0 ? (
            <p className="text-faint text-sm">No results logged for this test yet.</p>
          ) : (
            <div className="bg-void border border-edgesoft rounded p-2">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292D38" vertical={false} />
                  <XAxis dataKey="date" stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={{ stroke: "#333744" }} />
                  <YAxis stroke="#5B5F6E" fontSize={11} tickLine={false} axisLine={false} width={50} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "#191C23", border: "1px solid #333744", borderRadius: 5, fontSize: 12 }} labelStyle={{ color: "#8F94A3" }} />
                  <Line type="monotone" dataKey="value" name={selectedType + (unitFor ? ` (${unitFor})` : "")} stroke="#6FA96A" strokeWidth={2.5} dot={{ r: 3.5, fill: "#6FA96A" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="font-display text-lg font-semibold mb-2">All Test Results ({rows.length})</h2>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="bg-surface border border-edge rounded p-3 flex justify-between text-sm">
              <span>{new Date(r.date).toLocaleDateString()} — {r.testType}</span>
              <span className="font-mono text-good">{r.value} {r.unit}</span>
            </li>
          ))}
        </ul>
        {rows.length === 0 && <p className="text-faint text-sm">No test results yet.</p>}
      </div>
    </div>
  );
}

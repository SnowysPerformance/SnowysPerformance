"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function TestsPage() {
  const [testType, setTestType] = useState("Vertical Jump");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("in");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [results, setResults] = useState<any[]>([]);

  const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none";

  useEffect(() => {
    load();
  }, []);
  async function load() {
    setResults(await api("/api/tests"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/tests", { method: "POST", body: JSON.stringify({ testType, value: Number(value), unit, date }) });
    setValue("");
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold mb-4">Log a Test Result</h1>
        <form onSubmit={submit} className="bg-surface border border-edge rounded p-4 grid grid-cols-2 gap-3 max-w-lg">
          <input className={inputClass + " col-span-2"} placeholder="Test type" value={testType} onChange={(e) => setTestType(e.target.value)} />
          <input className={inputClass} type="number" step="any" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} />
          <input className={inputClass} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <input className={inputClass + " col-span-2"} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="col-span-2 bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors">Save</button>
        </form>
      </div>
      <div>
        <h2 className="font-display text-lg font-semibold mb-2">History</h2>
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.id} className="bg-surface border border-edge rounded p-3 flex justify-between text-sm">
              <span>
                {new Date(r.date).toLocaleDateString()} — {r.testType}
              </span>
              <span className="font-mono text-good">
                {r.value} {r.unit}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

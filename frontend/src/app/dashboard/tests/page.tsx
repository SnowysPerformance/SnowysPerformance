"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function TestsPage() {
  const [testType, setTestType] = useState("Vertical Jump");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("in");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [results, setResults] = useState<any[]>([]);

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
        <h1 className="text-xl font-semibold mb-4">Log a Test Result</h1>
        <form onSubmit={submit} className="bg-white border rounded p-4 grid grid-cols-2 gap-3 max-w-lg">
          <input className="border rounded px-2 py-2 col-span-2" placeholder="Test type" value={testType} onChange={(e) => setTestType(e.target.value)} />
          <input className="border rounded px-2 py-2" type="number" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} />
          <input className="border rounded px-2 py-2" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <input className="border rounded px-2 py-2 col-span-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="col-span-2 bg-slate-900 text-white rounded px-3 py-2">Save</button>
        </form>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">History</h2>
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.id} className="bg-white border rounded p-3 flex justify-between">
              <span>
                {new Date(r.date).toLocaleDateString()} — {r.testType}
              </span>
              <span className="font-mono text-slate-500">
                {r.value} {r.unit}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

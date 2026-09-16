"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function WorkoutsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [athleteId, setAthleteId] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const prefill = searchParams.get("exercise");
    if (prefill) setExerciseName(prefill);
  }, [searchParams]);

  useEffect(() => {
    if (user?.role === "COACH") api("/api/teams/me/athletes").then(setAthletes).catch(console.error);
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadLogs() {
    const data = await api("/api/workouts" + (athleteId ? `?athleteId=${athleteId}` : ""));
    setLogs(data);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/workouts", {
      method: "POST",
      body: JSON.stringify({
        athleteId: athleteId || undefined,
        exerciseName,
        date,
        sets: [{ weight: Number(weight), reps: Number(reps) }],
      }),
    });
    setExerciseName("");
    setWeight("");
    setReps("");
    loadLogs();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-4">Log a Workout</h1>
        <form onSubmit={submit} className="bg-white border rounded p-4 grid grid-cols-2 gap-3 max-w-lg">
          {user?.role === "COACH" && (
            <select className="border rounded px-2 py-2 col-span-2" value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
              <option value="">Select athlete…</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <input
            className="border rounded px-2 py-2 col-span-2"
            placeholder="Exercise"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
          />
          <input className="border rounded px-2 py-2" type="number" placeholder="Weight (lb)" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <input className="border rounded px-2 py-2" type="number" placeholder="Reps" value={reps} onChange={(e) => setReps(e.target.value)} />
          <input className="border rounded px-2 py-2 col-span-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="col-span-2 bg-slate-900 text-white rounded px-3 py-2">Save</button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">History</h2>
        <ul className="space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="bg-white border rounded p-3 flex justify-between">
              <span>
                {new Date(l.date).toLocaleDateString()} — {l.exerciseName}
              </span>
              <span className="font-mono text-slate-500">{l.volumeLoad} lb·reps</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

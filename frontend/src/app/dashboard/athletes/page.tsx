"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function AthletesPage() {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none";

  useEffect(() => {
    if (user?.role === "COACH") load();
  }, [user]);

  async function load() {
    setAthletes(await api("/api/teams/me/athletes"));
  }

  async function createAthlete(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/teams/me/athletes", { method: "POST", body: JSON.stringify({ name, email, password }) });
      setName("");
      setEmail("");
      setPassword("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (user?.role !== "COACH") return <p className="text-muted">Only coaches can view the athlete roster.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold mb-4">Add an Athlete</h1>
        <form onSubmit={createAthlete} className="bg-surface border border-edge rounded p-4 grid grid-cols-2 gap-3 max-w-lg">
          {error && <div className="col-span-2 text-red-400 text-sm">{error}</div>}
          <input className={inputClass + " col-span-2"} placeholder="Athlete's name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputClass} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="col-span-2 bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors">
            Create athlete login
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Athletes</h2>
        <ul className="space-y-2">
          {athletes.map((a) => (
            <li key={a.id} className="bg-surface border border-edge rounded p-3 text-sm">
              {a.name} — <span className="text-faint">{a.email}</span>
            </li>
          ))}
        </ul>
        {athletes.length === 0 && <p className="text-faint text-sm">No athletes yet — add one above.</p>}
      </div>
    </div>
  );
}

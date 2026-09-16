"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function AthletesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [planName, setPlanName] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);

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

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  async function createPlanForSelected() {
    if (!planName.trim() || selectedIds.length === 0) return;
    setCreatingPlan(true);
    try {
      const program = await api("/api/programs", { method: "POST", body: JSON.stringify({ name: planName.trim() }) });
      await Promise.all(selectedIds.map((athleteId) => api(`/api/programs/${program.id}/assign`, { method: "POST", body: JSON.stringify({ athleteId }) })));
      router.push(`/dashboard/programs/${program.id}`);
    } finally {
      setCreatingPlan(false);
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Athletes</h2>
          <span className="text-xs text-faint">Check one or more, then build a plan for exactly those athletes.</span>
        </div>
        <ul className="space-y-2">
          {athletes.map((a) => (
            <li key={a.id} className="bg-surface border border-edge rounded p-3 text-sm flex items-center gap-3">
              <input type="checkbox" checked={!!selected[a.id]} onChange={() => toggle(a.id)} className="flex-shrink-0" />
              <Link href={`/dashboard/athletes/${a.id}`} className="flex-1 hover:text-accent transition-colors">
                <span className="font-medium">{a.name}</span> — <span className="text-faint">{a.email}</span>
              </Link>
              <Link href={`/dashboard/athletes/${a.id}`} className="text-accent text-xs flex-shrink-0">View profile →</Link>
            </li>
          ))}
        </ul>
        {athletes.length === 0 && <p className="text-faint text-sm">No athletes yet — add one above.</p>}

        {selectedIds.length > 0 && (
          <div className="mt-4 bg-surface border border-accent rounded p-4 flex gap-2 items-center flex-wrap">
            <span className="text-xs text-muted flex-shrink-0">
              Build a plan for {selectedIds.length} athlete{selectedIds.length > 1 ? "s" : ""}:
            </span>
            <input className={inputClass + " flex-1 min-w-[160px]"} placeholder="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} />
            <button
              onClick={createPlanForSelected}
              disabled={!planName.trim() || creatingPlan}
              className="bg-accent text-accenttext text-sm font-semibold rounded px-4 py-2 disabled:opacity-40 flex-shrink-0"
            >
              {creatingPlan ? "Creating…" : "Create & Open Plan"}
            </button>
            {selectedIds.length > 1 && (
              <Link
                href={`/dashboard/athletes/compare?ids=${selectedIds.join(",")}`}
                className="text-sm border border-edge rounded px-4 py-2 text-muted hover:text-primary flex-shrink-0"
              >
                Compare Selected →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

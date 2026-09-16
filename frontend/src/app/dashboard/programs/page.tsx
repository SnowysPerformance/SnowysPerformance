"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function ProgramsPage() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [athletes, setAthletes] = useState<any[]>([]);

  useEffect(() => {
    load();
    if (user?.role === "COACH") api("/api/teams/me/athletes").then(setAthletes).catch(console.error);
  }, [user]);
  async function load() {
    setPrograms(await api("/api/programs"));
  }

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/programs", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setName("");
    load();
  }

  async function toggleAssign(programId: string, athleteId: string, assigned: boolean) {
    if (assigned) await api(`/api/programs/${programId}/assign/${athleteId}`, { method: "DELETE" });
    else await api(`/api/programs/${programId}/assign`, { method: "POST", body: JSON.stringify({ athleteId }) });
    load();
  }

  const isCoach = user?.role === "COACH";

  return (
    <div className="space-y-8">
      {isCoach && (
        <form onSubmit={createProgram} className="bg-surface border border-edge rounded p-4 flex gap-3 max-w-lg">
          <input
            className="bg-inputbg border border-edge rounded px-2 py-2 text-sm flex-1 placeholder-faint focus:border-accent outline-none"
            placeholder="New program name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors">Create</button>
        </form>
      )}
      <div>
        <h1 className="font-display text-xl font-semibold mb-4">{isCoach ? "Programs" : "Your Plans"}</h1>
        <ul className="space-y-3">
          {programs.map((p) => (
            <li key={p.id} className="bg-surface border border-edge rounded p-4">
              <Link href={`/dashboard/programs/${p.id}`} className="font-medium underline text-accent">
                {p.name}
              </Link>
              {isCoach && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {athletes.map((a) => {
                    const assigned = (p.assignments || []).some((asg: any) => asg.athlete.id === a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAssign(p.id, a.id, assigned)}
                        className={`text-xs rounded-full px-3 py-1 border ${assigned ? "bg-accent text-accenttext border-accent font-semibold" : "bg-void text-muted border-edge"}`}
                      >
                        {assigned ? "✓ " : "+ "}
                        {a.name}
                      </button>
                    );
                  })}
                  {athletes.length === 0 && <span className="text-xs text-faint">No athletes on your team yet.</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
        {programs.length === 0 && (
          <p className="text-faint text-sm">{isCoach ? "No programs yet." : "No plans have been assigned to you yet — check back with your coach."}</p>
        )}
      </div>
    </div>
  );
}

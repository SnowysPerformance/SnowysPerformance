"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function AthletesPage() {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === "COACH") api("/api/teams/me/athletes").then(setAthletes).catch(console.error);
  }, [user]);

  if (user?.role !== "COACH") return <p className="text-muted">Only coaches can view the athlete roster.</p>;

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4">Athletes</h1>
      <ul className="space-y-2">
        {athletes.map((a) => (
          <li key={a.id} className="bg-surface border border-edge rounded p-3 text-sm">
            {a.name} — <span className="text-faint">{a.email}</span>
          </li>
        ))}
      </ul>
      {athletes.length === 0 && <p className="text-faint text-sm">No athletes yet. Share your Team ID from the Overview page.</p>}
    </div>
  );
}

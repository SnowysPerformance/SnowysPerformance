"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function ProgramDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [program, setProgram] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/programs/${params.id}`)
      .then(setProgram)
      .catch((err) => setError(err.message));
  }, [params.id]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!program) return <p className="text-faint">Loading…</p>;

  function logThis(exerciseName: string) {
    router.push(`/dashboard/workouts?exercise=${encodeURIComponent(exerciseName)}`);
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4">{program.name}</h1>
      {program.weeks.map((w: any) => (
        <div key={w.id} className="mb-6">
          <h2 className="font-medium mb-2 text-muted">{w.name || `Week ${w.weekNumber}`}</h2>
          {w.days.length === 0 && <p className="text-faint text-sm">No days added yet.</p>}
          {w.days.map((d: any) => (
            <div key={d.id} className="bg-surface border border-edge rounded p-3 mb-2">
              <div className="font-medium">{d.name || `Day ${d.dayOfWeek}`}</div>
              <ul className="text-sm text-muted mt-1 space-y-1">
                {d.exercises.map((ex: any) => (
                  <li key={ex.id} className="flex items-center justify-between">
                    <span>
                      {ex.exerciseName} — {ex.sets}x{ex.reps}
                      {ex.percentOfMax ? ` @ ${ex.percentOfMax}%` : ""}
                    </span>
                    {user?.role === "ATHLETE" && (
                      <button onClick={() => logThis(ex.exerciseName)} className="text-xs underline text-accent ml-3 flex-shrink-0">
                        Log this
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

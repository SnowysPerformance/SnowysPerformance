"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none";

export default function AthletePlanTab({ params }: { params: { id: string } }) {
  const athleteId = params.id;
  const router = useRouter();
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [pickProgramId, setPickProgramId] = useState("");
  const [newPlanName, setNewPlanName] = useState("");
  const [canEdit, setCanEdit] = useState(true);
  const [actionError, setActionError] = useState("");

  async function load() {
    setAllPrograms(await api("/api/programs"));
  }
  useEffect(() => {
    load();
    api(`/api/teams/me/athletes/${athleteId}`).then((a) => setCanEdit(a.canEdit !== false)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const assigned = allPrograms.filter((p) => (p.assignments || []).some((a: any) => a.athlete.id === athleteId));
  const unassigned = allPrograms.filter((p) => !(p.assignments || []).some((a: any) => a.athlete.id === athleteId));

  async function assign() {
    if (!pickProgramId) return;
    setActionError("");
    try {
      await api(`/api/programs/${pickProgramId}/assign`, { method: "POST", body: JSON.stringify({ athleteId }) });
      setPickProgramId("");
      load();
    } catch (err: any) {
      setActionError(err.message);
    }
  }
  async function unassign(programId: string) {
    setActionError("");
    try {
      await api(`/api/programs/${programId}/assign/${athleteId}`, { method: "DELETE" });
      load();
    } catch (err: any) {
      setActionError(err.message);
    }
  }
  async function createPlan() {
    if (!newPlanName.trim()) return;
    setActionError("");
    try {
      const program = await api("/api/programs", { method: "POST", body: JSON.stringify({ name: newPlanName.trim() }) });
      await api(`/api/programs/${program.id}/assign`, { method: "POST", body: JSON.stringify({ athleteId }) });
      router.push(`/dashboard/programs/${program.id}`);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <p className="text-xs text-amber-400">
          You have view-only access to this athlete — you can see their plans here, but assigning or unassigning needs edit permission.
        </p>
      )}
      {actionError && <p className="text-red-400 text-sm">{actionError}</p>}
      {canEdit && (
        <div className="bg-surface border border-edge rounded p-4 flex gap-2 flex-wrap">
          <input className={inputClass + " flex-1 min-w-[160px]"} placeholder="New plan name" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} />
          <button onClick={createPlan} className="bg-accent text-accenttext text-sm font-semibold rounded px-3 flex-shrink-0">
            Create New Plan
          </button>
        </div>
      )}
      {canEdit && unassigned.length > 0 && (
        <div className="flex gap-2">
          <select className={inputClass + " flex-1"} value={pickProgramId} onChange={(e) => setPickProgramId(e.target.value)}>
            <option value="">Or assign an existing plan…</option>
            {unassigned.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={assign} className="bg-accent text-accenttext text-sm font-semibold rounded px-3 flex-shrink-0">
            Assign
          </button>
        </div>
      )}
      <div className="space-y-2">
        {assigned.map((p) => (
          <div key={p.id} className="bg-surface border border-edge rounded p-3 text-sm flex justify-between items-center">
            <Link href={`/dashboard/programs/${p.id}`} className="text-accent underline">
              {p.name}
            </Link>
            {canEdit && (
              <button onClick={() => unassign(p.id)} className="text-faint hover:text-red-400 text-xs">
                Unassign
              </button>
            )}
          </div>
        ))}
        {assigned.length === 0 && <p className="text-faint text-sm">No plans yet{canEdit ? " — create one above." : "."}</p>}
      </div>
    </div>
  );
}

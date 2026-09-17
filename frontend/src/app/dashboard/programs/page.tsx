"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { downloadJSON, readFileAsJSON, safeFileName } from "@/lib/dataTransfer";

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none";

export default function ProgramsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftSelection, setDraftSelection] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [importError, setImportError] = useState("");

  const isCoach = user?.role === "COACH";

  useEffect(() => {
    load();
    if (isCoach) api("/api/teams/me/athletes").then(setAthletes).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setPrograms(await api("/api/programs"));
  }

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/programs", { method: "POST", body: JSON.stringify({ name }) });
    setName("");
    load();
  }

  async function deleteProgram(program: any) {
    if (!confirm(`Delete "${program.name}"? This removes the whole plan — every phase, week, and exercise in it — for everyone it's assigned to. This can't be undone.`)) return;
    await api(`/api/programs/${program.id}`, { method: "DELETE" });
    load();
  }

  async function exportProgram(program: any) {
    const data = await api(`/api/data/export/program/${program.id}`);
    downloadJSON(`${safeFileName(program.name)}-program.json`, data);
  }

  async function importProgramFile(file: File) {
    setImportError("");
    try {
      const data = await readFileAsJSON(file);
      const result = await api("/api/data/import", { method: "POST", body: JSON.stringify(data) });
      if (result.imported === "program" && result.programId) {
        router.push(`/dashboard/programs/${result.programId}`);
      } else {
        // A whole-team export file was dropped in here — it still imports
        // fine (programs + libraries), just report what came in.
        load();
        alert(`Imported ${result.programsImported ?? 0} program(s), ${result.libraryImported ?? 0} exercise(s), and ${result.testTypesImported ?? 0} test type(s).`);
      }
    } catch (err: any) {
      setImportError(err.message);
    }
  }

  function openAssign(program: any) {
    if (expandedId === program.id) {
      setExpandedId(null);
      return;
    }
    const currentlyAssigned: Record<string, boolean> = {};
    (program.assignments || []).forEach((a: any) => (currentlyAssigned[a.athlete.id] = true));
    setDraftSelection(currentlyAssigned);
    setExpandedId(program.id);
  }

  async function saveAssignments(program: any) {
    setSaving(true);
    try {
      const currentlyAssignedIds = new Set((program.assignments || []).map((a: any) => a.athlete.id));
      const selectedIds = new Set(Object.keys(draftSelection).filter((id) => draftSelection[id]));

      const toAssign = [...selectedIds].filter((id) => !currentlyAssignedIds.has(id));
      const toUnassign = [...currentlyAssignedIds].filter((id) => !selectedIds.has(id as string));

      await Promise.all([
        ...toAssign.map((athleteId) => api(`/api/programs/${program.id}/assign`, { method: "POST", body: JSON.stringify({ athleteId }) })),
        ...toUnassign.map((athleteId) => api(`/api/programs/${program.id}/assign/${athleteId}`, { method: "DELETE" })),
      ]);
      setExpandedId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {isCoach && (
        <div className="space-y-2">
          <form onSubmit={createProgram} className="bg-surface border border-edge rounded p-4 flex gap-3 max-w-lg">
            <input className={inputClass + " flex-1"} placeholder="New program name" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors">Create</button>
          </form>
          <div className="flex items-center gap-2">
            <label className="text-xs border border-edge rounded px-3 py-1.5 text-muted hover:text-primary cursor-pointer">
              Import a program (.json)
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importProgramFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {importError && <span className="text-xs text-red-400">{importError}</span>}
          </div>
        </div>
      )}

      <div>
        <h1 className="font-display text-xl font-semibold mb-4">{isCoach ? "Programs" : "Your Plans"}</h1>
        <ul className="space-y-3">
          {programs.map((p) => (
            <li key={p.id} className="bg-surface border border-edge rounded p-4">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/dashboard/programs/${p.id}`} className="font-medium underline text-accent">
                  {p.name}
                </Link>
                {isCoach && (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => openAssign(p)} className="text-xs text-muted hover:text-primary">
                      {expandedId === p.id ? "Close" : "Assign to athletes ▾"}
                    </button>
                    <button onClick={() => exportProgram(p)} className="text-xs text-muted hover:text-primary" title="Download this plan as a JSON file">
                      Export
                    </button>
                    <button onClick={() => deleteProgram(p)} className="text-xs text-faint hover:text-red-400" title="Delete this plan">
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {p.assignments?.length > 0 && expandedId !== p.id && (
                <div className="text-xs text-faint mt-2">Currently assigned to: {p.assignments.map((a: any) => a.athlete.name).join(", ")}</div>
              )}

              {isCoach && expandedId === p.id && (
                <div className="mt-3 border-t border-edgesoft pt-3">
                  <div className="text-xs text-faint mb-2">Check every athlete who should have this plan:</div>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {athletes.map((a) => (
                      <label key={a.id} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={!!draftSelection[a.id]}
                          onChange={() => setDraftSelection((s) => ({ ...s, [a.id]: !s[a.id] }))}
                        />
                        {a.name}
                      </label>
                    ))}
                    {athletes.length === 0 && <span className="text-xs text-faint">No athletes on your team yet.</span>}
                  </div>
                  <button
                    onClick={() => saveAssignments(p)}
                    disabled={saving}
                    className="bg-accent text-accenttext text-sm font-semibold rounded px-4 py-2 disabled:opacity-40"
                  >
                    {saving ? "Saving…" : "Save Assignments"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {programs.length === 0 && (
          <p className="text-faint text-sm">{isCoach ? "No programs yet." : "No plans have been assigned to you yet."}</p>
        )}
      </div>
    </div>
  );
}

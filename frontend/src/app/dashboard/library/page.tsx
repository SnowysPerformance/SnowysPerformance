"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none";

function RelationEditor({ list, onAdd, onRemove }: { list: string[]; onAdd: (n: string) => void; onRemove: (n: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {list.length === 0 && <span className="text-xs text-faint">None yet</span>}
        {list.map((n) => (
          <span key={n} className="inline-flex items-center gap-1 bg-raised border border-edgesoft rounded px-2 py-1 text-xs">
            {n}
            <button onClick={() => onRemove(n)} className="text-faint hover:text-red-400">✕</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className={inputClass + " flex-1"} placeholder="Add exercise name" value={val} onChange={(e) => setVal(e.target.value)} />
        <button
          onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}
          className="text-xs border border-edge rounded px-3 text-muted hover:text-primary flex-shrink-0"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isCoach = user?.role === "COACH";

  async function load() {
    setItems(await api("/api/library"));
  }
  useEffect(() => {
    load();
  }, []);

  async function addExercise() {
    if (!newName.trim()) return;
    await api("/api/library", { method: "POST", body: JSON.stringify({ name: newName.trim() }) });
    setNewName("");
    load();
  }
  async function deleteExercise(id: string) {
    await api(`/api/library/${id}`, { method: "DELETE" });
    load();
  }
  async function updateRelations(item: any, field: "regressions" | "progressions", list: string[]) {
    await api(`/api/library/${item.id}`, { method: "PATCH", body: JSON.stringify({ [field]: list }) });
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold mb-4">Exercise Library</h1>
        <p className="text-xs text-faint mb-4">Shared across your whole team — attach easier (regression) or harder (progression) variations to any exercise.</p>
        <div className="bg-surface border border-edge rounded p-4 flex gap-2 max-w-lg">
          <input className={inputClass + " flex-1"} placeholder="Exercise name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button onClick={addExercise} className="bg-accent text-accenttext text-sm font-semibold rounded px-3 flex-shrink-0">Add</button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const regressions: string[] = item.regressions || [];
          const progressions: string[] = item.progressions || [];
          const isOpen = expandedId === item.id;
          return (
            <div key={item.id} className="bg-surface border border-edge rounded p-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setExpandedId(isOpen ? null : item.id)} className="text-sm font-medium text-left flex-1">
                  {item.name}
                </button>
                {isCoach && (
                  <button onClick={() => deleteExercise(item.id)} className="text-faint hover:text-red-400 text-xs flex-shrink-0">
                    Delete
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-edgesoft space-y-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-faint mb-2">Regressions (easier)</div>
                    <RelationEditor
                      list={regressions}
                      onAdd={(n) => updateRelations(item, "regressions", [...regressions, n])}
                      onRemove={(n) => updateRelations(item, "regressions", regressions.filter((x) => x !== n))}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-faint mb-2">Progressions (harder)</div>
                    <RelationEditor
                      list={progressions}
                      onAdd={(n) => updateRelations(item, "progressions", [...progressions, n])}
                      onRemove={(n) => updateRelations(item, "progressions", progressions.filter((x) => x !== n))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <p className="text-faint text-sm">No exercises yet — add one above.</p>}
      </div>
    </div>
  );
}

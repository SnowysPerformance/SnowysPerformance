"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const textareaClass =
  "w-full bg-inputbg border border-edge rounded px-3 py-2 text-sm placeholder-faint focus:border-accent outline-none min-h-[100px]";

// Coach-only free-text notes about an athlete — injury history, needs
// analysis, archetype, and general notes. The athlete never sees this tab;
// it only exists under the coach-facing athlete workspace. Every coach on
// the team can read these regardless of their edit permission level (they
// can already see everyone's plans/progress) — only saving changes is
// gated, same as any other edit for this athlete.
export default function AthleteNotesTab({ params }: { params: { id: string } }) {
  const athleteId = params.id;

  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [injuryHistory, setInjuryHistory] = useState("");
  const [needsAnalysis, setNeedsAnalysis] = useState("");
  const [archetype, setArchetype] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    api(`/api/teams/me/athletes/${athleteId}`)
      .then((a) => {
        setCanEdit(a.canEdit !== false);
        setInjuryHistory(a.injuryHistory || "");
        setNeedsAnalysis(a.needsAnalysis || "");
        setArchetype(a.archetype || "");
        setGeneralNotes(a.generalNotes || "");
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [athleteId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaved(false);
    setSaving(true);
    try {
      await api(`/api/teams/me/athletes/${athleteId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ injuryHistory, needsAnalysis, archetype, generalNotes }),
      });
      setSaved(true);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-faint text-sm">Loading…</p>;
  if (loadError) return <p className="text-red-400 text-sm">{loadError}</p>;

  return (
    <form onSubmit={save} className="space-y-4 max-w-2xl">
      <p className="text-xs text-faint">
        These notes are only visible to coaches — the athlete never sees this tab.
        {!canEdit && " You have view-only access to this athlete, so these fields can't be changed here."}
      </p>
      {saveError && <div className="text-red-400 text-sm">{saveError}</div>}
      {saved && <div className="text-good text-sm">Saved.</div>}

      <div>
        <div className="text-xs text-faint mb-1 uppercase tracking-wide">Injury History</div>
        <textarea
          className={textareaClass}
          value={injuryHistory}
          onChange={(e) => { setInjuryHistory(e.target.value); setSaved(false); }}
          disabled={!canEdit}
          placeholder="Past injuries, surgeries, ongoing limitations…"
        />
      </div>

      <div>
        <div className="text-xs text-faint mb-1 uppercase tracking-wide">Needs Analysis</div>
        <textarea
          className={textareaClass}
          value={needsAnalysis}
          onChange={(e) => { setNeedsAnalysis(e.target.value); setSaved(false); }}
          disabled={!canEdit}
          placeholder="Movement quality, weaknesses, priorities to address…"
        />
      </div>

      <div>
        <div className="text-xs text-faint mb-1 uppercase tracking-wide">Archetype</div>
        <textarea
          className={textareaClass}
          value={archetype}
          onChange={(e) => { setArchetype(e.target.value); setSaved(false); }}
          disabled={!canEdit}
          placeholder="Athlete type/build/sport profile…"
        />
      </div>

      <div>
        <div className="text-xs text-faint mb-1 uppercase tracking-wide">General Notes</div>
        <textarea
          className={textareaClass}
          value={generalNotes}
          onChange={(e) => { setGeneralNotes(e.target.value); setSaved(false); }}
          disabled={!canEdit}
          placeholder="Anything else worth remembering…"
        />
      </div>

      {canEdit && (
        <button
          className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Notes"}
        </button>
      )}
    </form>
  );
}

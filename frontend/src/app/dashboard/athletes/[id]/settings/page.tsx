"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const inputClass = "w-full bg-inputbg border border-edge rounded px-3 py-2 text-sm placeholder-faint focus:border-accent outline-none";

export default function AthleteSettingsTab({ params }: { params: { id: string } }) {
  const athleteId = params.id;
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    api("/api/teams/me/athletes").then((list) => {
      const a = list.find((x: any) => x.id === athleteId);
      if (a) {
        setName(a.name);
        setEmail(a.email);
      }
      setLoaded(true);
    });
  }, [athleteId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const body: any = { name, email };
      if (newPassword.trim()) body.password = newPassword.trim();
      await api(`/api/teams/me/athletes/${athleteId}`, { method: "PATCH", body: JSON.stringify(body) });
      setNewPassword("");
      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeAthlete() {
    setRemoving(true);
    try {
      await api(`/api/teams/me/athletes/${athleteId}`, { method: "DELETE" });
      router.push("/dashboard/athletes");
    } catch (err: any) {
      setError(err.message);
      setRemoving(false);
    }
  }

  if (!loaded) return null;

  return (
    <div className="space-y-6 max-w-lg">
      <form onSubmit={save} className="bg-surface border border-edge rounded p-4 space-y-3">
        <h2 className="font-display text-lg font-semibold">Athlete Info</h2>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <div>
          <label className="text-xs text-faint block mb-1">Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-faint block mb-1">Email (login)</label>
          <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-faint block mb-1">Reset password</label>
          <input
            className={inputClass}
            type="password"
            placeholder="Leave blank to keep current password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <button disabled={saving} className="bg-accent text-accenttext text-sm font-semibold rounded px-4 py-2 disabled:opacity-40">
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span className="text-good text-xs ml-3">Saved.</span>}
      </form>

      <div className="bg-surface border border-red-900/50 rounded p-4 space-y-3">
        <h2 className="font-display text-lg font-semibold text-red-400">Danger Zone</h2>
        <p className="text-xs text-faint">
          Removing this athlete permanently deletes their account and all of their workout logs, test results, and
          wearable data. This cannot be undone.
        </p>
        {!confirmingRemove ? (
          <button
            onClick={() => setConfirmingRemove(true)}
            className="border border-red-800 text-red-400 text-sm font-semibold rounded px-4 py-2 hover:bg-red-950/40"
          >
            Remove from Team
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-red-400">Are you sure? This can't be undone.</span>
            <button
              onClick={removeAthlete}
              disabled={removing}
              className="bg-red-700 text-white text-sm font-semibold rounded px-4 py-2 disabled:opacity-40"
            >
              {removing ? "Removing…" : "Yes, Remove Athlete"}
            </button>
            <button onClick={() => setConfirmingRemove(false)} className="text-sm text-faint hover:text-muted px-2">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

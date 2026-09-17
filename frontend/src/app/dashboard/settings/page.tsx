"use client";
import { useState } from "react";
import { api, updateStoredUser } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { downloadJSON, readFileAsJSON, safeFileName } from "@/lib/dataTransfer";

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none w-full";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const isCoach = user?.role === "COACH";

  const [importMsg, setImportMsg] = useState("");
  const [importError, setImportError] = useState("");

  async function exportMyData() {
    const data = await api(`/api/data/export/athlete/${user.id}`);
    downloadJSON(`${safeFileName(user.name)}-export.json`, data);
  }
  async function exportTeam() {
    const data = await api("/api/data/export/team");
    downloadJSON(`${safeFileName(data.team?.name || "team")}-backup.json`, data);
  }
  async function importTeamFile(file: File) {
    setImportMsg("");
    setImportError("");
    try {
      const data = await readFileAsJSON(file);
      const result = await api("/api/data/import", { method: "POST", body: JSON.stringify(data) });
      if (result.imported === "team") {
        setImportMsg(`Imported ${result.programsImported} program(s), ${result.libraryImported} exercise(s), and ${result.testTypesImported} test type(s).`);
      } else if (result.imported === "program" && result.programId) {
        setImportMsg("Imported 1 program. Open it from the Programs page.");
      }
    } catch (err: any) {
      setImportError(err.message);
    }
  }

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSaved(false);
    setProfileSaving(true);
    try {
      const updated = await api("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name: name.trim(), email: email.trim() }) });
      updateStoredUser({ name: updated.name, email: updated.email });
      refreshUser();
      setProfileSaved(true);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-lg">
      <h1 className="font-display text-xl font-semibold">Account Settings</h1>

      <form onSubmit={saveProfile} className="bg-surface border border-edge rounded-lg p-4 space-y-3">
        <div className="font-display text-sm uppercase tracking-wide text-muted">Profile</div>
        {profileError && <div className="text-red-400 text-sm">{profileError}</div>}
        {profileSaved && <div className="text-good text-sm">Saved.</div>}
        <div>
          <div className="text-xs text-faint mb-1">Name</div>
          <input className={inputClass} value={name} onChange={(e) => { setName(e.target.value); setProfileSaved(false); }} />
        </div>
        <div>
          <div className="text-xs text-faint mb-1">Email (this is your login username)</div>
          <input className={inputClass} value={email} onChange={(e) => { setEmail(e.target.value); setProfileSaved(false); }} />
        </div>
        <button
          className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40"
          disabled={profileSaving || !name.trim() || !email.trim()}
        >
          {profileSaving ? "Saving…" : "Save Profile"}
        </button>
      </form>

      <form onSubmit={savePassword} className="bg-surface border border-edge rounded-lg p-4 space-y-3">
        <div className="font-display text-sm uppercase tracking-wide text-muted">Change Password</div>
        {passwordError && <div className="text-red-400 text-sm">{passwordError}</div>}
        {passwordSaved && <div className="text-good text-sm">Password changed.</div>}
        <div>
          <div className="text-xs text-faint mb-1">Current password</div>
          <input className={inputClass} type="password" value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); setPasswordSaved(false); }} />
        </div>
        <div>
          <div className="text-xs text-faint mb-1">New password</div>
          <input className={inputClass} type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordSaved(false); }} />
        </div>
        <div>
          <div className="text-xs text-faint mb-1">Confirm new password</div>
          <input className={inputClass} type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSaved(false); }} />
        </div>
        <button
          className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40"
          disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
        >
          {passwordSaving ? "Saving…" : "Change Password"}
        </button>
      </form>

      <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
        <div className="font-display text-sm uppercase tracking-wide text-muted">Your Data</div>
        {isCoach ? (
          <>
            <p className="text-xs text-faint">
              Download a backup of everything on your team — every program, athlete roster, workout log, and test result — as a single file you can keep or hand off. Importing that
              file back in (here or on another team) recreates the programs and exercise/test libraries; it does not recreate athlete logins or their logged history, since passwords
              can't be included in the file for security.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportTeam} className="bg-accent text-accenttext text-sm font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors">
                Export whole team
              </button>
              <label className="text-sm border border-edge rounded px-4 py-2 text-muted hover:text-primary cursor-pointer">
                Import backup (.json)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importTeamFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {importMsg && <div className="text-good text-sm">{importMsg}</div>}
            {importError && <div className="text-red-400 text-sm">{importError}</div>}
          </>
        ) : (
          <>
            <p className="text-xs text-faint">Download everything logged under your account — your workouts and test results — as a file you can keep for yourself.</p>
            <button onClick={exportMyData} className="bg-accent text-accenttext text-sm font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors">
              Export my data
            </button>
          </>
        )}
      </div>
    </div>
  );
}

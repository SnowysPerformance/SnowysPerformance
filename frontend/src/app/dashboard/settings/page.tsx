"use client";
import { useState } from "react";
import { api, updateStoredUser } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none w-full";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

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
    </div>
  );
}

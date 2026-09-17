"use client";
import { useEffect, useState } from "react";
import { api, updateStoredUser } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { downloadJSON, readFileAsJSON, safeFileName, copyText } from "@/lib/dataTransfer";

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none w-full";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const isCoach = user?.role === "COACH";

  const [importMsg, setImportMsg] = useState("");
  const [importError, setImportError] = useState("");

  // Invite an assistant coach to help run this team — only the head coach
  // can do this. A whole separate, brand-new team is now handed out only
  // by the platform admin (see the Admin page), not from here.
  const [coachInvites, setCoachInvites] = useState<any[]>([]);
  const [coachInviteEmail, setCoachInviteEmail] = useState("");
  const [inviteAccessLevel, setInviteAccessLevel] = useState<"FULL" | "RESTRICTED">("FULL");
  const [inviteAthleteIds, setInviteAthleteIds] = useState<string[]>([]);
  const [coachInviteError, setCoachInviteError] = useState("");
  const [coachInviteSending, setCoachInviteSending] = useState(false);
  const [copiedCoachInviteId, setCopiedCoachInviteId] = useState<string | null>(null);

  // The other coaches on this team, and whether they're full-access or
  // restricted to specific athletes — plus whether I'm the head coach,
  // which is what actually controls whether I can invite/manage them.
  const [teamCoaches, setTeamCoaches] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const amHeadCoach: boolean = !!teamCoaches.find((c) => c.isMe)?.isHeadCoach;
  const [coachRowError, setCoachRowError] = useState<Record<string, string>>({});
  const [coachRowSaving, setCoachRowSaving] = useState<Record<string, boolean>>({});
  const [coachRowEdits, setCoachRowEdits] = useState<Record<string, { accessLevel: "FULL" | "RESTRICTED"; athleteIds: string[] }>>({});

  useEffect(() => {
    if (isCoach) {
      loadCoachInvites();
      loadTeamCoaches();
      api("/api/teams/me/athletes").then(setAthletes).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoach]);

  async function loadCoachInvites() {
    const all = await api("/api/invites");
    setCoachInvites(all.filter((inv: any) => inv.role === "COACH"));
  }

  async function loadTeamCoaches() {
    const list = await api("/api/coaches");
    setTeamCoaches(list);
    const edits: Record<string, { accessLevel: "FULL" | "RESTRICTED"; athleteIds: string[] }> = {};
    for (const c of list) edits[c.id] = { accessLevel: c.accessLevel, athleteIds: c.athleteIds || [] };
    setCoachRowEdits(edits);
  }

  function inviteLinkFor(token: string) {
    return `${window.location.origin}/accept-invite?token=${token}`;
  }

  function toggleInviteAthlete(id: string) {
    setInviteAthleteIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function sendCoachInvite(e: React.FormEvent) {
    e.preventDefault();
    setCoachInviteError("");
    setCoachInviteSending(true);
    try {
      const body: any = { email: coachInviteEmail.trim(), role: "COACH", accessLevel: inviteAccessLevel };
      if (inviteAccessLevel === "RESTRICTED") body.athleteIds = inviteAthleteIds;
      const invite = await api("/api/invites", { method: "POST", body: JSON.stringify(body) });
      setCoachInviteEmail("");
      setInviteAthleteIds([]);
      await loadCoachInvites();
      await copyText(inviteLinkFor(invite.token));
      setCopiedCoachInviteId(invite.id);
      setTimeout(() => setCopiedCoachInviteId((id) => (id === invite.id ? null : id)), 2500);
    } catch (err: any) {
      setCoachInviteError(err.message);
    } finally {
      setCoachInviteSending(false);
    }
  }

  async function saveCoachAccess(coachId: string) {
    const edit = coachRowEdits[coachId];
    if (!edit) return;
    setCoachRowError((e) => ({ ...e, [coachId]: "" }));
    setCoachRowSaving((s) => ({ ...s, [coachId]: true }));
    try {
      await api(`/api/coaches/${coachId}`, {
        method: "PATCH",
        body: JSON.stringify({
          accessLevel: edit.accessLevel,
          athleteIds: edit.accessLevel === "RESTRICTED" ? edit.athleteIds : [],
        }),
      });
      await loadTeamCoaches();
    } catch (err: any) {
      setCoachRowError((e) => ({ ...e, [coachId]: err.message }));
    } finally {
      setCoachRowSaving((s) => ({ ...s, [coachId]: false }));
    }
  }

  async function copyCoachInviteLink(invite: any) {
    await copyText(inviteLinkFor(invite.token));
    setCopiedCoachInviteId(invite.id);
    setTimeout(() => setCopiedCoachInviteId((id) => (id === invite.id ? null : id)), 2500);
  }

  async function revokeCoachInvite(invite: any) {
    if (!confirm(`Cancel the invite to ${invite.email}? That link will stop working.`)) return;
    await api(`/api/invites/${invite.id}`, { method: "DELETE" });
    loadCoachInvites();
  }

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

      {isCoach && (
        <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
          <div className="font-display text-sm uppercase tracking-wide text-muted">Invite an Assistant Coach</div>
          <p className="text-xs text-faint">
            {amHeadCoach
              ? "Send a one-time link so someone else can help coach this team. There's no public sign-up — this is the only way an assistant coach account gets created."
              : "Only the head coach can invite an assistant coach to this team."}
          </p>

          {amHeadCoach && (
            <form onSubmit={sendCoachInvite} className="space-y-3">
              <input className={inputClass} type="email" placeholder="Coach's email" value={coachInviteEmail} onChange={(e) => setCoachInviteEmail(e.target.value)} />

              <div className="space-y-2">
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={inviteAccessLevel === "FULL"} onChange={() => setInviteAccessLevel("FULL")} />
                    Full access (every athlete)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={inviteAccessLevel === "RESTRICTED"} onChange={() => setInviteAccessLevel("RESTRICTED")} />
                    Restricted to specific athletes
                  </label>
                </div>
                {inviteAccessLevel === "RESTRICTED" && (
                  <div className="bg-raised border border-edgesoft rounded p-2 max-h-40 overflow-y-auto space-y-1">
                    <p className="text-xs text-faint pb-1">
                      They'll be able to see every athlete's plans/progress, but can only edit the ones checked here.
                    </p>
                    {athletes.length === 0 && <p className="text-xs text-faint">No athletes on the team yet.</p>}
                    {athletes.map((a) => (
                      <label key={a.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={inviteAthleteIds.includes(a.id)} onChange={() => toggleInviteAthlete(a.id)} />
                        {a.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                disabled={coachInviteSending || !coachInviteEmail.trim()}
                className="bg-accent text-accenttext text-sm font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40"
              >
                {coachInviteSending ? "Sending…" : "Send Invite"}
              </button>
            </form>
          )}
          {coachInviteError && <p className="text-red-400 text-sm">{coachInviteError}</p>}
          {coachInvites.length > 0 && (
            <ul className="space-y-2">
              {coachInvites.map((inv) => {
                const expired = new Date(inv.expiresAt) < new Date();
                const status = inv.usedAt ? "Joined" : expired ? "Expired" : "Pending";
                return (
                  <li key={inv.id} className="bg-raised border border-edgesoft rounded p-2.5 text-sm flex items-center justify-between gap-2">
                    <span className="truncate">
                      {inv.email}{" "}
                      <span className={`text-xs ${inv.usedAt ? "text-good" : expired ? "text-faint" : "text-accent"}`}>
                        · {status}{inv.accessLevel === "RESTRICTED" ? " · restricted" : ""}
                      </span>
                    </span>
                    {!inv.usedAt && !expired && (
                      <span className="flex items-center gap-3 flex-shrink-0">
                        <button onClick={() => copyCoachInviteLink(inv)} className="text-xs text-accent underline">
                          {copiedCoachInviteId === inv.id ? "Copied!" : "Copy link"}
                        </button>
                        <button onClick={() => revokeCoachInvite(inv)} className="text-xs text-faint hover:text-red-400">Cancel</button>
                      </span>
                    )}
                    {(inv.usedAt || expired) && (
                      <button onClick={() => revokeCoachInvite(inv)} className="text-xs text-faint hover:text-red-400 flex-shrink-0">Remove</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {isCoach && teamCoaches.length > 1 && (
        <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
          <div className="font-display text-sm uppercase tracking-wide text-muted">Coaches on This Team</div>
          {!amHeadCoach && (
            <p className="text-xs text-faint">Only the head coach can change these permissions.</p>
          )}
          <ul className="space-y-3">
            {teamCoaches.map((c) => {
              const edit = coachRowEdits[c.id] || { accessLevel: c.accessLevel, athleteIds: c.athleteIds || [] };
              const canManage = amHeadCoach && !c.isMe && !c.isHeadCoach;
              return (
                <li key={c.id} className="bg-raised border border-edgesoft rounded p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm truncate">
                      {c.name} {c.isMe && <span className="text-xs text-faint">(you)</span>}
                      {c.isHeadCoach && <span className="text-xs text-accent"> · Head Coach</span>}
                      <span className="text-xs text-faint"> · {c.email}</span>
                    </span>
                  </div>
                  {canManage ? (
                    <>
                      <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            checked={edit.accessLevel === "FULL"}
                            onChange={() => setCoachRowEdits((e) => ({ ...e, [c.id]: { ...edit, accessLevel: "FULL" } }))}
                          />
                          Full access
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            checked={edit.accessLevel === "RESTRICTED"}
                            onChange={() => setCoachRowEdits((e) => ({ ...e, [c.id]: { ...edit, accessLevel: "RESTRICTED" } }))}
                          />
                          Restricted
                        </label>
                      </div>
                      {edit.accessLevel === "RESTRICTED" && (
                        <div className="bg-surface border border-edgesoft rounded p-2 max-h-32 overflow-y-auto space-y-1">
                          {athletes.map((a) => (
                            <label key={a.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={edit.athleteIds.includes(a.id)}
                                onChange={() =>
                                  setCoachRowEdits((e) => ({
                                    ...e,
                                    [c.id]: {
                                      ...edit,
                                      athleteIds: edit.athleteIds.includes(a.id)
                                        ? edit.athleteIds.filter((x) => x !== a.id)
                                        : [...edit.athleteIds, a.id],
                                    },
                                  }))
                                }
                              />
                              {a.name}
                            </label>
                          ))}
                        </div>
                      )}
                      {coachRowError[c.id] && <p className="text-red-400 text-xs">{coachRowError[c.id]}</p>}
                      <button
                        onClick={() => saveCoachAccess(c.id)}
                        disabled={coachRowSaving[c.id]}
                        className="bg-accent text-accenttext text-xs font-semibold rounded px-3 py-1.5 hover:bg-accentstrong transition-colors disabled:opacity-40"
                      >
                        {coachRowSaving[c.id] ? "Saving…" : "Save"}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-faint">
                      {c.accessLevel === "RESTRICTED"
                        ? `Restricted — can edit ${c.athleteIds.length} athlete${c.athleteIds.length === 1 ? "" : "s"} (can view all)`
                        : "Full access"}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

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

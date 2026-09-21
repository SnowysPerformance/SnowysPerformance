"use client";
import { useEffect, useState } from "react";
import { api, saveSession, updateStoredUser } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none w-full";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const isCoach = user?.role === "COACH";

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

  // ---- WHOOP (athlete only) ----
  const [whoopConnected, setWhoopConnected] = useState(false);
  const [whoopConnectedAt, setWhoopConnectedAt] = useState<string | null>(null);
  const [whoopLoading, setWhoopLoading] = useState(true);
  const [whoopBusy, setWhoopBusy] = useState(false);
  const [whoopError, setWhoopError] = useState("");
  const [whoopNotice, setWhoopNotice] = useState("");

  // ---- Teams (coach only) ----
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState("");
  const [switchingTeamId, setSwitchingTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState("");

  // ---- Coaches on this team + assistant-coach invites (coach only) ----
  const [coaches, setCoaches] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [coachesLoading, setCoachesLoading] = useState(true);
  const [coachesError, setCoachesError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSent, setInviteSent] = useState(false);

  function loadTeams() {
    setTeamsLoading(true);
    api("/api/auth/teams")
      .then(setTeams)
      .catch((err) => setTeamsError(err.message))
      .finally(() => setTeamsLoading(false));
  }

  function loadCoaches() {
    setCoachesLoading(true);
    Promise.all([api("/api/coaches"), api("/api/invites")])
      .then(([c, i]) => {
        setCoaches(c);
        setInvites(i.filter((inv: any) => inv.role === "COACH" && !inv.usedAt));
      })
      .catch((err) => setCoachesError(err.message))
      .finally(() => setCoachesLoading(false));
  }

  useEffect(() => {
    if (!isCoach) return;
    loadTeams();
    loadCoaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoach]);

  function loadWhoopStatus() {
    setWhoopLoading(true);
    api("/api/integrations/whoop/status")
      .then((s) => {
        setWhoopConnected(!!s.connected);
        setWhoopConnectedAt(s.connectedAt || null);
      })
      .catch((err) => setWhoopError(err.message))
      .finally(() => setWhoopLoading(false));
  }

  useEffect(() => {
    if (isCoach) return;
    loadWhoopStatus();

    // After WHOOP sends the athlete's browser back here, show whether linking worked.
    const params = new URLSearchParams(window.location.search);
    const whoopStatus = params.get("whoop");
    if (whoopStatus === "connected") {
      setWhoopNotice("WHOOP connected! Your recovery and strain data will start showing up shortly.");
    } else if (whoopStatus === "error") {
      setWhoopError("Couldn't connect WHOOP (" + (params.get("whoop_message") || "please try again") + ").");
    }
    if (whoopStatus) {
      params.delete("whoop");
      params.delete("whoop_message");
      const rest = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoach]);

  async function connectWhoop() {
    setWhoopError("");
    setWhoopBusy(true);
    try {
      const { url } = await api("/api/integrations/whoop/authorize");
      window.location.href = url;
    } catch (err: any) {
      setWhoopError(err.message);
      setWhoopBusy(false);
    }
  }

  async function disconnectWhoop() {
    setWhoopError("");
    setWhoopBusy(true);
    try {
      await api("/api/integrations/whoop", { method: "DELETE" });
      setWhoopConnected(false);
      setWhoopConnectedAt(null);
      setWhoopNotice("");
    } catch (err: any) {
      setWhoopError(err.message);
    } finally {
      setWhoopBusy(false);
    }
  }

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

  // Switching (or creating) a team hands back a fresh login token scoped to
  // that team, exactly like signing in — save it and reload the whole app
  // so every page (athletes, programs, etc.) re-fetches under the new team
  // instead of showing stale data from the old one.
  async function switchTeam(teamId: string) {
    setTeamsError("");
    setSwitchingTeamId(teamId);
    try {
      const res = await api(`/api/auth/teams/${teamId}/switch`, { method: "POST" });
      saveSession(res.token, res.user);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setTeamsError(err.message);
      setSwitchingTeamId("");
    }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreateTeamError("");
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    try {
      const res = await api("/api/auth/teams", { method: "POST", body: JSON.stringify({ name: newTeamName.trim() }) });
      saveSession(res.token, res.user);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setCreateTeamError(err.message);
      setCreatingTeam(false);
    }
  }

  async function sendCoachInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSent(false);
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api("/api/invites", { method: "POST", body: JSON.stringify({ email: inviteEmail.trim(), role: "COACH" }) });
      setInviteEmail("");
      setInviteSent(true);
      loadCoaches();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(id: string) {
    try {
      await api(`/api/invites/${id}`, { method: "DELETE" });
      loadCoaches();
    } catch (err: any) {
      setCoachesError(err.message);
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

      {!isCoach && (
        <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
          <div className="font-display text-sm uppercase tracking-wide text-muted">WHOOP</div>
          {whoopError && <div className="text-red-400 text-sm">{whoopError}</div>}
          {whoopNotice && <div className="text-good text-sm">{whoopNotice}</div>}
          {whoopLoading ? (
            <p className="text-faint text-sm">Loading…</p>
          ) : whoopConnected ? (
            <>
              <div className="flex items-center justify-between bg-void border border-edgesoft rounded px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Connected</div>
                  {whoopConnectedAt && (
                    <div className="text-[11px] text-faint">
                      Since {new Date(whoopConnectedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={disconnectWhoop}
                  disabled={whoopBusy}
                  className="text-xs bg-raised hover:bg-edgesoft rounded px-3 py-1.5 flex-shrink-0 transition-colors disabled:opacity-40"
                >
                  {whoopBusy ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
              <p className="text-xs text-faint">
                Your recovery, strain, and sleep data will sync in automatically and show up on your Progress page.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-faint">
                Connect your WHOOP account to bring your recovery, strain, and sleep data into your Progress page.
              </p>
              <button
                onClick={connectWhoop}
                disabled={whoopBusy}
                className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40"
              >
                {whoopBusy ? "Connecting…" : "Connect WHOOP"}
              </button>
            </>
          )}
        </div>
      )}

      {isCoach && (
        <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
          <div className="font-display text-sm uppercase tracking-wide text-muted">Your Teams</div>
          {teamsError && <div className="text-red-400 text-sm">{teamsError}</div>}
          {teamsLoading && <p className="text-faint text-sm">Loading…</p>}

          {!teamsLoading && (
            <div className="space-y-2">
              {teams.map((t: any) => (
                <div key={t.teamId} className="flex items-center justify-between bg-void border border-edgesoft rounded px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.teamName}</div>
                    <div className="text-[11px] text-faint">{t.isHeadCoach ? "Head Coach" : "Assistant Coach"}</div>
                  </div>
                  {t.active ? (
                    <span className="text-[11px] uppercase tracking-wide text-accent font-semibold flex-shrink-0">Active</span>
                  ) : (
                    <button
                      onClick={() => switchTeam(t.teamId)}
                      disabled={!!switchingTeamId}
                      className="text-xs bg-raised hover:bg-edgesoft rounded px-3 py-1.5 flex-shrink-0 transition-colors disabled:opacity-40"
                    >
                      {switchingTeamId === t.teamId ? "Switching…" : "Switch"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={createTeam} className="pt-2 border-t border-edgesoft space-y-2">
            <div className="text-xs text-faint">Start a brand-new, separate team — you'll be its head coach with a fresh, empty roster.</div>
            {createTeamError && <div className="text-red-400 text-sm">{createTeamError}</div>}
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="New team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
              <button
                className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40 flex-shrink-0"
                disabled={creatingTeam || !newTeamName.trim()}
              >
                {creatingTeam ? "Creating…" : "Create Team"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isCoach && (
        <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
          <div className="font-display text-sm uppercase tracking-wide text-muted">Coaches on This Team</div>
          {coachesError && <div className="text-red-400 text-sm">{coachesError}</div>}
          {coachesLoading && <p className="text-faint text-sm">Loading…</p>}

          {!coachesLoading && (
            <div className="space-y-2">
              {coaches.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between bg-void border border-edgesoft rounded px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}{c.isMe && " (you)"}</div>
                    <div className="text-[11px] text-faint">{c.isHeadCoach ? "Head Coach" : `Assistant Coach — ${c.accessLevel === "RESTRICTED" ? "Restricted access" : "Full access"}`}</div>
                  </div>
                </div>
              ))}

              {invites.length > 0 && (
                <>
                  <div className="text-[11px] uppercase tracking-wide text-faint pt-1">Pending Invites</div>
                  {invites.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between bg-void border border-edgesoft rounded px-3 py-2">
                      <div className="text-sm truncate">{inv.email}</div>
                      <button onClick={() => revokeInvite(inv.id)} className="text-xs text-red-400 hover:text-red-300 flex-shrink-0">
                        Revoke
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {user?.isHeadCoach ? (
            <form onSubmit={sendCoachInvite} className="pt-2 border-t border-edgesoft space-y-2">
              <div className="text-xs text-faint">Invite someone to join this team as an assistant coach (full access — you can restrict them to specific athletes later from the roster).</div>
              {inviteError && <div className="text-red-400 text-sm">{inviteError}</div>}
              {inviteSent && <div className="text-good text-sm">Invite sent.</div>}
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteSent(false); }}
                />
                <button
                  className="bg-accent text-accenttext font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40 flex-shrink-0"
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? "Sending…" : "Invite Coach"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-faint pt-2 border-t border-edgesoft">Only this team's head coach can invite additional coaches.</p>
          )}
        </div>
      )}
    </div>
  );
}

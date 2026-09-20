"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { copyText } from "@/lib/dataTransfer";

const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none w-full";

// The platform-admin-only page: Mark invites, suspends, or permanently
// removes head coaches (each one the sole owner of their own separate
// team). Nobody else can even load this page — the backend re-checks
// isPlatformAdmin on every call here, regardless of what this page shows.
export default function AdminPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});

  async function load() {
    setLoadError("");
    try {
      const [teamList, inviteList] = await Promise.all([api("/api/admin/teams"), api("/api/admin/invites")]);
      setTeams(teamList);
      setInvites(inviteList);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function inviteLinkFor(token: string) {
    return `${window.location.origin}/accept-invite?token=${token}`;
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setSending(true);
    try {
      const invite = await api("/api/admin/invites", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setEmail("");
      await load();
      await copyText(inviteLinkFor(invite.token));
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId((id) => (id === invite.id ? null : id)), 2500);
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function copyInviteLink(inv: any) {
    await copyText(inviteLinkFor(inv.token));
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId((id) => (id === inv.id ? null : id)), 2500);
  }

  async function revokeInvite(inv: any) {
    if (!confirm(`Cancel the head-coach invite to ${inv.email}? That link will stop working.`)) return;
    await api(`/api/admin/invites/${inv.id}`, { method: "DELETE" });
    load();
  }

  async function toggleSuspend(headCoach: any, suspend: boolean) {
    setRowError((e) => ({ ...e, [headCoach.id]: "" }));
    setRowBusy((b) => ({ ...b, [headCoach.id]: true }));
    try {
      await api(`/api/admin/head-coaches/${headCoach.id}/suspend`, { method: "PATCH", body: JSON.stringify({ suspended: suspend }) });
      await load();
    } catch (err: any) {
      setRowError((e) => ({ ...e, [headCoach.id]: err.message }));
    } finally {
      setRowBusy((b) => ({ ...b, [headCoach.id]: false }));
    }
  }

  // Removing a head coach takes their whole team with it; removing an
  // assistant coach only removes that one account. The confirmation
  // wording makes clear which one is about to happen.
  async function deleteCoach(coach: any, team: any) {
    const confirmed = coach.isHeadCoach
      ? confirm(
          `Permanently delete "${team.name}"? This removes ${coach.name}, every assistant coach and athlete on the team, and all of their programs, logs, and messages. This can't be undone.`
        )
      : confirm(`Remove ${coach.name} (${coach.email}) as a coach? The team and everyone else on it are unaffected. This can't be undone.`);
    if (!confirmed) return;
    setRowError((e) => ({ ...e, [coach.id]: "" }));
    setRowBusy((b) => ({ ...b, [coach.id]: true }));
    try {
      await api(`/api/admin/head-coaches/${coach.id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      setRowError((e) => ({ ...e, [coach.id]: err.message }));
    } finally {
      setRowBusy((b) => ({ ...b, [coach.id]: false }));
    }
  }

  if (loading) return <p className="text-faint text-sm">Loading…</p>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-display text-xl font-semibold mb-1">Admin</h1>
        <p className="text-xs text-faint">
          Signed in as {user?.name} — you're the platform admin, so this page (and only this page) lets you invite,
          suspend, or remove head coaches. Every other coach and athlete never sees this.
        </p>
      </div>
      {loadError && <p className="text-red-400 text-sm">{loadError}</p>}

      <div className="bg-surface border border-edge rounded-lg p-4 space-y-3">
        <div className="font-display text-sm uppercase tracking-wide text-muted">Invite a Head Coach</div>
        <p className="text-xs text-faint">
          Send a one-time link so someone can set up their own, completely separate team — a fresh slate, no athletes,
          and they're the sole head coach of it. This is the only way a new team gets created on the platform.
        </p>
        <form onSubmit={sendInvite} className="flex gap-2">
          <input className={inputClass + " flex-1"} type="email" placeholder="Their email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button disabled={sending || !email.trim()} className="bg-accent text-accenttext text-sm font-semibold rounded px-4 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40 flex-shrink-0">
            {sending ? "Sending…" : "Send Invite"}
          </button>
        </form>
        {inviteError && <p className="text-red-400 text-sm">{inviteError}</p>}
        {invites.length > 0 && (
          <ul className="space-y-2">
            {invites.map((inv) => {
              const expired = new Date(inv.expiresAt) < new Date();
              const status = inv.usedAt ? "Joined" : expired ? "Expired" : "Pending";
              return (
                <li key={inv.id} className="bg-raised border border-edgesoft rounded p-2.5 text-sm flex items-center justify-between gap-2">
                  <span className="truncate">
                    {inv.email} <span className={`text-xs ${inv.usedAt ? "text-good" : expired ? "text-faint" : "text-accent"}`}>· {status}</span>
                  </span>
                  {!inv.usedAt && !expired && (
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <button onClick={() => copyInviteLink(inv)} className="text-xs text-accent underline">
                        {copiedId === inv.id ? "Copied!" : "Copy link"}
                      </button>
                      <button onClick={() => revokeInvite(inv)} className="text-xs text-faint hover:text-red-400">Cancel</button>
                    </span>
                  )}
                  {(inv.usedAt || expired) && (
                    <button onClick={() => revokeInvite(inv)} className="text-xs text-faint hover:text-red-400 flex-shrink-0">Remove</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Teams &amp; Head Coaches</h2>
        <ul className="space-y-2">
          {teams.map((t) => (
            <li key={t.id} className="bg-surface border border-edge rounded p-3 text-sm space-y-2">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-faint">
                  {t.coachCount} coach{t.coachCount === 1 ? "" : "es"} · {t.athleteCount} athlete{t.athleteCount === 1 ? "" : "s"}
                </div>
              </div>
              {/* Every coach on the team, head coach included — this is the
                  only place that shows accounts made before invites were
                  required, since those never went through this page. Every
                  coach can be suspended or removed here, not just the head
                  coach — removing the head coach takes the whole team with
                  it (see deleteCoach), removing anyone else just removes
                  that one account. */}
              <ul className="space-y-1.5">
                {(t.coaches || []).map((c: any) => (
                  <li key={c.id} className="bg-raised border border-edgesoft rounded p-2 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-faint truncate">
                      {c.name} ({c.email}){c.isHeadCoach ? " · Head Coach" : ""}
                      {c.suspended && <span className="text-red-400"> · Suspended</span>}
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => toggleSuspend(c, !c.suspended)}
                        disabled={rowBusy[c.id]}
                        className="text-xs border border-edge rounded px-3 py-1.5 text-muted hover:text-primary disabled:opacity-40"
                      >
                        {rowBusy[c.id] ? "Working…" : c.suspended ? "Unsuspend" : "Suspend"}
                      </button>
                      <button
                        onClick={() => deleteCoach(c, t)}
                        disabled={rowBusy[c.id]}
                        className="text-xs text-faint hover:text-red-400 disabled:opacity-40"
                      >
                        {c.isHeadCoach ? "Delete team" : "Remove"}
                      </button>
                    </span>
                    {rowError[c.id] && <p className="text-red-400 text-xs w-full">{rowError[c.id]}</p>}
                  </li>
                ))}
                {(!t.coaches || t.coaches.length === 0) && <li className="text-xs text-faint">No coaches</li>}
              </ul>
            </li>
          ))}
          {teams.length === 0 && <p className="text-faint text-sm">No teams yet.</p>}
        </ul>
      </div>
    </div>
  );
}

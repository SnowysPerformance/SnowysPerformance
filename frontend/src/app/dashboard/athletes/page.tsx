"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { downloadJSON, safeFileName, copyText } from "@/lib/dataTransfer";

export default function AthletesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Invite-only athlete signup: a coach sends a one-time link to a specific
  // email instead of anyone being able to self-register. This is now the
  // only way (besides "Add an Athlete" below, which the coach controls
  // directly) that a new athlete login gets created.
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [planName, setPlanName] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);

  // Inline edit panel — change an athlete's name, login email, or reset
  // their password, or remove them entirely.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const inputClass = "bg-inputbg border border-edge rounded px-2 py-2 text-sm placeholder-faint focus:border-accent outline-none";

  useEffect(() => {
    if (user?.role === "COACH") {
      load();
      loadInvites();
    }
  }, [user]);

  async function load() {
    setAthletes(await api("/api/teams/me/athletes"));
  }

  async function loadInvites() {
    const all = await api("/api/invites");
    setInvites(all.filter((inv: any) => inv.role !== "COACH"));
  }

  function inviteLinkFor(token: string) {
    return `${window.location.origin}/accept-invite?token=${token}`;
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSending(true);
    try {
      const invite = await api("/api/invites", { method: "POST", body: JSON.stringify({ email: inviteEmail.trim(), role: "ATHLETE" }) });
      setInviteEmail("");
      await loadInvites();
      // Copy the new link straight away so it's one less step for the coach.
      await copyText(inviteLinkFor(invite.token));
      setCopiedInviteId(invite.id);
      setTimeout(() => setCopiedInviteId((id) => (id === invite.id ? null : id)), 2500);
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviteSending(false);
    }
  }

  async function copyInviteLink(invite: any) {
    await copyText(inviteLinkFor(invite.token));
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId((id) => (id === invite.id ? null : id)), 2500);
  }

  async function revokeInvite(invite: any) {
    if (!confirm(`Cancel the invite to ${invite.email}? That link will stop working.`)) return;
    await api(`/api/invites/${invite.id}`, { method: "DELETE" });
    loadInvites();
  }

  async function createAthlete(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/teams/me/athletes", { method: "POST", body: JSON.stringify({ name, email, password }) });
      setName("");
      setEmail("");
      setPassword("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  async function createPlanForSelected() {
    if (!planName.trim() || selectedIds.length === 0) return;
    setCreatingPlan(true);
    try {
      const program = await api("/api/programs", { method: "POST", body: JSON.stringify({ name: planName.trim() }) });
      await Promise.all(selectedIds.map((athleteId) => api(`/api/programs/${program.id}/assign`, { method: "POST", body: JSON.stringify({ athleteId }) })));
      router.push(`/dashboard/programs/${program.id}`);
    } finally {
      setCreatingPlan(false);
    }
  }

  function openEdit(a: any) {
    if (editingId === a.id) {
      setEditingId(null);
      return;
    }
    setEditName(a.name);
    setEditEmail(a.email);
    setEditPassword("");
    setEditError("");
    setEditingId(a.id);
  }

  async function saveEdit(id: string) {
    setEditError("");
    setEditSaving(true);
    try {
      const body: any = { name: editName.trim(), email: editEmail.trim() };
      if (editPassword) body.password = editPassword;
      await api(`/api/teams/me/athletes/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setEditingId(null);
      load();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteAthlete(a: any) {
    if (!confirm(`Remove ${a.name} from your team? This permanently deletes their login and every workout, test, and plan assignment they have. This can't be undone.`)) return;
    await api(`/api/teams/me/athletes/${a.id}`, { method: "DELETE" });
    if (editingId === a.id) setEditingId(null);
    load();
  }

  async function exportAthlete(a: any) {
    const data = await api(`/api/data/export/athlete/${a.id}`);
    downloadJSON(`${safeFileName(a.name)}-export.json`, data);
  }

  if (user?.role !== "COACH") return <p className="text-muted">Only coaches can view the athlete roster.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold mb-1">Invite an Athlete</h1>
        <p className="text-xs text-faint mb-4">
          Send a one-time link to their email — only someone with that exact link can join your team. Nobody can sign up on their own anymore.
        </p>
        <form onSubmit={sendInvite} className="bg-surface border border-edge rounded p-4 flex gap-3 max-w-lg">
          <input className={inputClass + " flex-1"} type="email" placeholder="Athlete's email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <button disabled={inviteSending || !inviteEmail.trim()} className="bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40 flex-shrink-0">
            {inviteSending ? "Sending…" : "Send Invite"}
          </button>
        </form>
        {inviteError && <p className="text-red-400 text-sm mt-2">{inviteError}</p>}

        {invites.length > 0 && (
          <ul className="mt-3 space-y-2 max-w-lg">
            {invites.map((inv) => {
              const expired = new Date(inv.expiresAt) < new Date();
              const status = inv.usedAt ? "Joined" : expired ? "Expired" : "Pending";
              return (
                <li key={inv.id} className="bg-surface border border-edgesoft rounded p-2.5 text-sm flex items-center justify-between gap-2">
                  <span className="truncate">
                    {inv.email}{" "}
                    <span className={`text-xs ${inv.usedAt ? "text-good" : expired ? "text-faint" : "text-accent"}`}>· {status}</span>
                  </span>
                  {!inv.usedAt && !expired && (
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <button onClick={() => copyInviteLink(inv)} className="text-xs text-accent underline">
                        {copiedInviteId === inv.id ? "Copied!" : "Copy link"}
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
        <h1 className="font-display text-xl font-semibold mb-1">Add an Athlete Directly</h1>
        <p className="text-xs text-faint mb-4">Or skip the invite and set up their login yourself — you pick their password, and can hand it to them however you like.</p>
        <form onSubmit={createAthlete} className="bg-surface border border-edge rounded p-4 grid grid-cols-2 gap-3 max-w-lg">
          {error && <div className="col-span-2 text-red-400 text-sm">{error}</div>}
          <input className={inputClass + " col-span-2"} placeholder="Athlete's name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputClass} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="col-span-2 bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors">
            Create athlete login
          </button>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Athletes</h2>
          <span className="text-xs text-faint">Check one or more, then build a plan for exactly those athletes.</span>
        </div>
        <ul className="space-y-2">
          {athletes.map((a) => (
            <li key={a.id} className="bg-surface border border-edge rounded p-3 text-sm">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={!!selected[a.id]} onChange={() => toggle(a.id)} className="flex-shrink-0" />
                <Link href={`/dashboard/athletes/${a.id}`} className="flex-1 hover:text-accent transition-colors">
                  <span className="font-medium">{a.name}</span> — <span className="text-faint">{a.email}</span>
                </Link>
                <Link href={`/dashboard/athletes/${a.id}`} className="text-accent text-xs flex-shrink-0">View profile →</Link>
                <button onClick={() => openEdit(a)} className="text-xs text-muted hover:text-primary flex-shrink-0">
                  {editingId === a.id ? "Close" : "Edit"}
                </button>
                <button onClick={() => exportAthlete(a)} className="text-xs text-muted hover:text-primary flex-shrink-0" title="Download this athlete's workouts and test results">
                  Export
                </button>
                <button onClick={() => deleteAthlete(a)} className="text-xs text-faint hover:text-red-400 flex-shrink-0" title="Remove this athlete">
                  Delete
                </button>
              </div>

              {editingId === a.id && (
                <div className="mt-3 border-t border-edgesoft pt-3 grid grid-cols-2 gap-2 max-w-lg">
                  {editError && <div className="col-span-2 text-red-400 text-xs">{editError}</div>}
                  <div>
                    <div className="text-xs text-faint mb-1">Name</div>
                    <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <div className="text-xs text-faint mb-1">Email (login username)</div>
                    <input className={inputClass} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-faint mb-1">Reset password (leave blank to keep their current one)</div>
                    <input className={inputClass + " w-full"} type="password" placeholder="New password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                  </div>
                  <button
                    onClick={() => saveEdit(a.id)}
                    disabled={editSaving || !editName.trim() || !editEmail.trim()}
                    className="col-span-2 bg-accent text-accenttext text-sm font-semibold rounded px-4 py-2 disabled:opacity-40"
                  >
                    {editSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {athletes.length === 0 && <p className="text-faint text-sm">No athletes yet — add one above.</p>}

        {selectedIds.length > 0 && (
          <div className="mt-4 bg-surface border border-accent rounded p-4 flex gap-2 items-center flex-wrap">
            <span className="text-xs text-muted flex-shrink-0">
              Build a plan for {selectedIds.length} athlete{selectedIds.length > 1 ? "s" : ""}:
            </span>
            <input className={inputClass + " flex-1 min-w-[160px]"} placeholder="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} />
            <button
              onClick={createPlanForSelected}
              disabled={!planName.trim() || creatingPlan}
              className="bg-accent text-accenttext text-sm font-semibold rounded px-4 py-2 disabled:opacity-40 flex-shrink-0"
            >
              {creatingPlan ? "Creating…" : "Create & Open Plan"}
            </button>
            {selectedIds.length > 1 && (
              <Link
                href={`/dashboard/athletes/compare?ids=${selectedIds.join(",")}`}
                className="text-sm border border-edge rounded px-4 py-2 text-muted hover:text-primary flex-shrink-0"
              >
                Compare Selected →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, saveSession } from "@/lib/api";

// The landing page for a coach-sent invite link
// (/accept-invite?token=...). It looks up the invite by its (unguessable)
// token, shows which team and email it's for, and lets that person pick a
// name and password to finish creating their athlete login. This is now
// the ONLY way an athlete account gets created — there's no open
// self-registration anymore.
//
// The actual page reads the ?token= query param via useSearchParams, which
// Next.js requires to sit inside a <Suspense> boundary (otherwise the
// production build fails while trying to prerender this page) — so the
// default export below is just that boundary, and AcceptInviteForm does
// the real work.
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AcceptInviteShell><p className="text-sm text-faint">Loading…</p></AcceptInviteShell>}>
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <div className="bg-surface border border-edge p-8 rounded-lg shadow-lg w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">❄️</span>
          <h1 className="font-display text-lg font-semibold">Snowy's Performance</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{ email: string; teamName: string; role: "COACH" | "ATHLETE" } | null>(null);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("This invite link is missing its token — ask your coach for a fresh link.");
      setLoading(false);
      return;
    }
    api(`/api/invites/token/${token}`)
      .then((data) => setInvite(data))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (password !== confirmPassword) {
      setSubmitError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await api("/api/invites/accept", { method: "POST", body: JSON.stringify({ token, name, password }) });
      saveSession(data.token, data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full bg-inputbg border border-edge rounded px-3 py-2 text-sm placeholder-faint focus:border-accent outline-none";

  return (
    <AcceptInviteShell>
      {loading && <p className="text-sm text-faint">Checking your invite…</p>}

      {!loading && loadError && (
        <>
          <p className="text-sm text-red-400">{loadError}</p>
          <p className="text-sm text-muted">
            <Link className="underline text-accent" href="/login">
              Back to sign in
            </Link>
          </p>
        </>
      )}

      {!loading && invite && (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted">
            You've been invited to join <span className="text-primary font-medium">{invite.teamName}</span> as a{" "}
            <span className="text-primary font-medium">{invite.role === "COACH" ? "coach" : "athlete"}</span>, using{" "}
            <span className="text-primary font-medium">{invite.email}</span>. Pick a name and password to finish setting up your account.
          </p>
          {submitError && <div className="text-red-400 text-sm">{submitError}</div>}
          <input className={inputClass} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <button
            className="w-full bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40"
            disabled={submitting || !name.trim() || !password || !confirmPassword}
          >
            {submitting ? "Creating account…" : "Join team"}
          </button>
        </form>
      )}
    </AcceptInviteShell>
  );
}

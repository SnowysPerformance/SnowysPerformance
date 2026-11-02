"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveSession } from "@/lib/api";
import AuthTabs from "@/components/AuthTabs";

// Register page for NEW COACHES. Sign-up is invite-only: you type your
// email, and you can only continue if that email has a coach invite waiting
// (sent from the admin page or by a head coach). Then you pick your name,
// password (and team name, for a brand-new team) and you're in. Athletes
// don't register here — their coach creates their login.
type Found = { email: string; newTeam: boolean; teamName: string | null; invitedByName: string };

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const inputClass = "w-full bg-inputbg border border-edge rounded px-3 py-2 text-sm placeholder-faint focus:border-accent outline-none";
  const buttonClass = "w-full bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors disabled:opacity-40";

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      setFound(await api("/api/invites/register/check", { method: "POST", body: JSON.stringify({ email }) }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setBusy(true);
    try {
      const data = await api("/api/invites/register", {
        method: "POST",
        body: JSON.stringify({ email: found!.email, name, password, teamName: found!.newTeam ? teamName : undefined }),
      });
      saveSession(data.token, data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-void p-4">
      <div className="bg-surface border border-edge p-8 rounded-lg shadow-lg w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">❄️</span>
          <h1 className="font-display text-lg font-semibold">Snowy's Performance</h1>
        </div>
        <AuthTabs active="register" />

        {!found ? (
          <form onSubmit={check} className="space-y-4">
            <p className="text-sm text-muted">
              <span className="text-primary font-medium">New coaches:</span> registration is invite-only. Enter the email your
              invite was sent to.
            </p>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className={buttonClass} disabled={busy || !email.trim()}>
              {busy ? "Checking…" : "Continue"}
            </button>
            <p className="text-xs text-faint">
              Athletes: you don't register here — your coach creates your login and sends you your email and password.
            </p>
          </form>
        ) : (
          <form onSubmit={register} className="space-y-4">
            <p className="text-sm text-muted">
              {found.newTeam ? (
                <>
                  Invite found for <span className="text-primary font-medium">{found.email}</span> from{" "}
                  <span className="text-primary font-medium">{found.invitedByName}</span> — you'll start your own team as its
                  head coach.
                </>
              ) : (
                <>
                  Invite found for <span className="text-primary font-medium">{found.email}</span> — you'll join{" "}
                  <span className="text-primary font-medium">{found.teamName}</span> as a coach (invited by {found.invitedByName}).
                </>
              )}
            </p>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            {found.newTeam && (
              <input className={inputClass} placeholder="Your team's name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            )}
            <input className={inputClass} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inputClass} type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input className={inputClass} type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <button className={buttonClass} disabled={busy || !name.trim() || !password || !confirmPassword}>
              {busy ? "Creating account…" : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => { setFound(null); setError(""); }}
              className="w-full text-xs text-faint underline"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="text-xs text-faint text-center">
          <Link className="underline" href="/terms">Terms</Link> · <Link className="underline" href="/privacy">Privacy</Link>
        </p>
      </div>
    </div>
  );
}

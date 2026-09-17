"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveSession } from "@/lib/api";

// Only coaches can register here — a coach account always creates a brand
// new team. Athletes can't self-register anymore: an athlete account is
// only ever created by accepting an invite link a coach sends them (see
// /accept-invite), so a stranger can't just join someone else's team.
export default function RegisterPage() {
  const [form, setForm] = useState({ teamName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/api/auth/register-team", {
        method: "POST",
        body: JSON.stringify({ teamName: form.teamName, name: form.name, email: form.email, password: form.password }),
      });
      saveSession(data.token, data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  }

  const inputClass = "w-full bg-inputbg border border-edge rounded px-3 py-2 text-sm placeholder-faint focus:border-accent outline-none";

  return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <form onSubmit={submit} className="bg-surface border border-edge p-8 rounded-lg shadow-lg w-full max-w-sm space-y-4">
        <h1 className="font-display text-lg font-semibold">Create a coach account</h1>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <input className={inputClass} placeholder="Team name" value={form.teamName} onChange={(e) => update("teamName", e.target.value)} />
        <input className={inputClass} placeholder="Your name" value={form.name} onChange={(e) => update("name", e.target.value)} />
        <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        <input className={inputClass} type="password" placeholder="Password" value={form.password} onChange={(e) => update("password", e.target.value)} />
        <button className="w-full bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors">Create account</button>
        <p className="text-xs text-faint">
          Are you an athlete? You'll need an invite link from your coach to join their team — ask them to send you one from their Athletes page.
        </p>
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link className="underline text-accent" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

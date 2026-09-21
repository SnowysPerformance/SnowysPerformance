"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveSession } from "@/lib/api";

export default function RegisterPage() {
  const [role, setRole] = useState<"COACH" | "ATHLETE">("COACH");
  const [form, setForm] = useState({ teamName: "", teamId: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const path = role === "COACH" ? "/api/auth/register-team" : "/api/auth/register-athlete";
      const body =
        role === "COACH"
          ? { teamName: form.teamName, name: form.name, email: form.email, password: form.password }
          : { teamId: form.teamId, name: form.name, email: form.email, password: form.password };
      const data = await api(path, { method: "POST", body: JSON.stringify(body) });
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
        <h1 className="font-display text-lg font-semibold">Create an account</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole("COACH")}
            className={`flex-1 rounded px-3 py-2 text-sm border ${role === "COACH" ? "bg-accent text-accenttext border-accent font-semibold" : "border-edge text-muted"}`}
          >
            Coach
          </button>
          <button
            type="button"
            onClick={() => setRole("ATHLETE")}
            className={`flex-1 rounded px-3 py-2 text-sm border ${role === "ATHLETE" ? "bg-accent text-accenttext border-accent font-semibold" : "border-edge text-muted"}`}
          >
            Athlete
          </button>
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        {role === "COACH" ? (
          <input className={inputClass} placeholder="Team name" value={form.teamName} onChange={(e) => update("teamName", e.target.value)} />
        ) : (
          <input className={inputClass} placeholder="Team ID (ask your coach)" value={form.teamId} onChange={(e) => update("teamId", e.target.value)} />
        )}
        <input className={inputClass} placeholder="Your name" value={form.name} onChange={(e) => update("name", e.target.value)} />
        <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        <input className={inputClass} type="password" placeholder="Password" value={form.password} onChange={(e) => update("password", e.target.value)} />
        <button className="w-full bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors">Create account</button>
        <p className="text-xs text-faint text-center">
          By creating an account you agree to our{" "}
          <Link className="underline" href="/terms">Terms</Link> and{" "}
          <Link className="underline" href="/privacy">Privacy Policy</Link>.
        </p>
      </form>
    </div>
  );
}

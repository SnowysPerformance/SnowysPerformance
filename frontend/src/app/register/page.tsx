"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Create an account</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole("COACH")}
            className={`flex-1 rounded px-3 py-2 border ${role === "COACH" ? "bg-slate-900 text-white" : ""}`}
          >
            Coach
          </button>
          <button
            type="button"
            onClick={() => setRole("ATHLETE")}
            className={`flex-1 rounded px-3 py-2 border ${role === "ATHLETE" ? "bg-slate-900 text-white" : ""}`}
          >
            Athlete
          </button>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {role === "COACH" ? (
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Team name"
            value={form.teamName}
            onChange={(e) => update("teamName", e.target.value)}
          />
        ) : (
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Team ID (ask your coach)"
            value={form.teamId}
            onChange={(e) => update("teamId", e.target.value)}
          />
        )}
        <input className="w-full border rounded px-3 py-2" placeholder="Your name" value={form.name} onChange={(e) => update("name", e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
        />
        <button className="w-full bg-slate-900 text-white rounded px-3 py-2">Create account</button>
      </form>
    </div>
  );
}

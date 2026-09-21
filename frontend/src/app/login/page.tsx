"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveSession } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      saveSession(data.token, data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <form onSubmit={submit} className="bg-surface border border-edge p-8 rounded-lg shadow-lg w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">❄️</span>
          <h1 className="font-display text-lg font-semibold">Snowy's Performance</h1>
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <input
          className="w-full bg-inputbg border border-edge rounded px-3 py-2 text-sm placeholder-faint focus:border-accent outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full bg-inputbg border border-edge rounded px-3 py-2 text-sm placeholder-faint focus:border-accent outline-none"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full bg-accent text-accenttext font-semibold rounded px-3 py-2 hover:bg-accentstrong transition-colors">Sign in</button>
        <p className="text-sm text-muted">
          No account?{" "}
          <Link className="underline text-accent" href="/register">
            Register
          </Link>
        </p>
        <p className="text-xs text-faint text-center">
          <Link className="underline" href="/terms">Terms</Link> · <Link className="underline" href="/privacy">Privacy</Link>
        </p>
      </form>
    </div>
  );
}

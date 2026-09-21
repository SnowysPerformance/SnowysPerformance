"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { computePRs } from "@/lib/prs";

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: "accent" | "chalk" }) {
  return (
    <div className="flex-1 min-w-[140px] bg-surface border border-edge rounded-lg px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <div className={`font-display text-2xl font-semibold mt-1 ${accent === "chalk" ? "text-chalk" : accent === "accent" ? "text-accent" : "text-primary"}`}>{value}</div>
    </div>
  );
}

function QuickLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="flex-1 min-w-[160px] bg-void border border-edgesoft hover:border-accent rounded-lg px-4 py-3 transition-colors">
      <div className="font-display text-sm font-semibold">{title}</div>
      <div className="text-xs text-faint mt-1">{sub}</div>
    </Link>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const isCoach = user?.role === "COACH";
  const [athletes, setAthletes] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (isCoach) {
          const [a, p] = await Promise.all([api("/api/teams/me/athletes"), api("/api/programs")]);
          setAthletes(a);
          setPrograms(p);
        } else {
          const [p, l] = await Promise.all([api("/api/programs"), api("/api/workouts")]);
          setPrograms(p);
          setLogs(l);
        }
      } catch {
        // stay on the empty-state view if this fails — the page below still renders fine
      } finally {
        setLoaded(true);
      }
    })();
  }, [isCoach]);

  const { prMap } = computePRs(logs);
  const recentPRs = logs.filter((l) => prMap[l.id]?.weightPR).slice(0, 5);
  const last7 = logs.filter((l) => Date.now() - new Date(l.date).getTime() < 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-1">Welcome, {user?.name}</h1>
      <p className="text-faint text-sm mb-6">
        Team ID: <span className="font-mono text-muted">{user?.teamId}</span>
        {isCoach && " — share this with athletes so they can register."}
      </p>

      {isCoach ? (
        <>
          <div className="flex flex-wrap gap-3 mb-6">
            <StatCard label="Athletes" value={loaded ? athletes.length : "…"} accent="accent" />
            <StatCard label="Active Programs" value={loaded ? programs.length : "…"} accent="chalk" />
            <StatCard label="Unassigned Programs" value={loaded ? programs.filter((p) => !(p.assignments || []).length).length : "…"} />
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <QuickLink href="/dashboard/athletes" title="Athletes" sub="Rosters, plans, and per-athlete testing" />
            <QuickLink href="/dashboard/programs" title="Programs" sub="Build and assign training plans" />
            <QuickLink href="/dashboard/library" title="Exercise Library" sub="Manage movements, regressions & progressions" />
          </div>

          <div className="bg-surface border border-edge rounded-lg p-4">
            <div className="font-display text-xs uppercase tracking-wide text-muted mb-3">Your Athletes</div>
            {athletes.length === 0 && loaded && <p className="text-faint text-sm">No athletes yet — share your team ID above so they can register.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {athletes.map((a: any) => (
                <Link key={a.id} href={`/dashboard/athletes/${a.id}`} className="flex items-center gap-2 bg-void border border-edgesoft hover:border-accent rounded px-3 py-2 text-sm transition-colors">
                  <span className="w-7 h-7 rounded bg-raised flex items-center justify-center font-display text-xs font-semibold text-muted flex-shrink-0">
                    {a.name?.slice(0, 2).toUpperCase()}
                  </span>
                  {a.name}
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-6">
            <StatCard label="Assigned Plans" value={loaded ? programs.length : "…"} accent="accent" />
            <StatCard label="Sessions Logged" value={loaded ? logs.length : "…"} accent="chalk" />
            <StatCard label="Logged Last 7 Days" value={loaded ? last7.length : "…"} />
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <QuickLink href="/dashboard/programs" title="Your Plans" sub="See what your coach has assigned" />
            <QuickLink href="/dashboard/workouts" title="Log a Workout" sub="Record today's session or a test" />
            <QuickLink href="/dashboard/progress" title="Progress" sub="Charts of your lifts and trends over time" />
          </div>

          <div className="bg-surface border border-edge rounded-lg p-4">
            <div className="font-display text-xs uppercase tracking-wide text-muted mb-3">Recent Personal Records</div>
            {recentPRs.length === 0 && loaded && <p className="text-faint text-sm">No PRs logged yet — once you log workouts, new bests show up here.</p>}
            <div className="space-y-2">
              {recentPRs.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between bg-void border border-edgesoft rounded px-3 py-2 text-sm">
                  <span>{l.exerciseName}</span>
                  <span className="font-mono text-chalk text-xs">{prMap[l.id]?.topWeight} lb</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

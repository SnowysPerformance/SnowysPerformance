"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

export default function AthleteWorkspaceLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const [athlete, setAthlete] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    api("/api/teams/me/athletes").then((list) => setAthlete(list.find((a: any) => a.id === params.id))).catch(console.error);
  }, [params.id]);

  const base = `/dashboard/athletes/${params.id}`;
  const tabs = [
    { href: base, label: "Plan" },
    { href: `${base}/log`, label: "Log" },
    { href: `${base}/progress`, label: "Progress" },
    { href: `${base}/testing`, label: "Testing" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <div>
      <Link href="/dashboard/athletes" className="text-xs text-faint underline hover:text-muted">
        ← All athletes
      </Link>
      <h1 className="font-display text-2xl font-semibold mt-2 mb-4">{athlete?.name || "…"}</h1>
      <div className="flex gap-1 border-b border-edgesoft mb-6">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 pb-2 text-sm font-medium border-b-2 transition-colors ${active ? "border-accent text-primary" : "border-transparent text-faint hover:text-muted"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}

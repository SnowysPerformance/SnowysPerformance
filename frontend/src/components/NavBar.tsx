"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

const coachLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/athletes", label: "Athletes" },
  { href: "/dashboard/programs", label: "Programs" },
  { href: "/dashboard/library", label: "Library" },
  { href: "/dashboard/settings", label: "Settings" },
];

const athleteLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/programs", label: "Your Plans" },
  { href: "/dashboard/workouts", label: "Log" },
  { href: "/dashboard/fatigue", label: "Progress" },
  { href: "/dashboard/tests", label: "Testing" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const links = user?.role === "COACH" ? coachLinks : athleteLinks;
  const showAdmin = !!user?.isPlatformAdmin;
  return (
    <aside className="w-56 bg-surface border-r border-edge text-primary p-4 flex flex-col flex-shrink-0">
      <div className="flex items-center gap-2 font-display font-semibold mb-6">
        <span>❄️</span> Snowy's Performance
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="block rounded px-3 py-2 text-sm text-muted hover:bg-raised hover:text-primary transition-colors">
            {l.label}
          </Link>
        ))}
        {showAdmin && (
          <Link href="/dashboard/admin" className="block rounded px-3 py-2 text-sm text-accent hover:bg-raised transition-colors">
            Admin
          </Link>
        )}
      </nav>
      <div className="text-xs text-faint mb-2">
        {user?.name} · {user?.role}
      </div>
      <button onClick={logout} className="text-xs underline text-muted text-left hover:text-primary">
        Log out
      </button>
    </aside>
  );
}

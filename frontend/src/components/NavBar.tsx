"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const links = user?.role === "COACH" ? coachLinks : athleteLinks;
  const showAdmin = !!user?.isPlatformAdmin;

  return (
    <aside className="w-60 bg-surface border-r border-edge text-primary flex flex-col flex-shrink-0">
      <div className="px-4 pt-5 pb-4 border-b border-edgesoft">
        <div className="flex items-center gap-2 font-display font-semibold text-[15.5px]">
          <span>❄️</span> Snowy's Performance
        </div>
        <div className="mt-1 text-[11px] text-faint uppercase tracking-wide">
          {user?.role === "COACH" ? "Coach Dashboard" : "Athlete Dashboard"}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/dashboard" && pathname?.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                "flex items-center gap-2 rounded px-3 py-2 text-[13.5px] font-medium transition-colors border " +
                (active
                  ? "bg-accentsoft border-accent/40 text-primary"
                  : "border-transparent text-muted hover:bg-raised hover:text-primary")
              }
              style={active ? { background: "rgba(126,200,227,0.14)", borderColor: "rgba(126,200,227,0.4)" } : undefined}
            >
              {l.label}
            </Link>
          );
        })}
        {showAdmin && (
          <Link
            key="/dashboard/admin"
            href="/dashboard/admin"
            className={
              "flex items-center gap-2 rounded px-3 py-2 text-[13.5px] font-medium transition-colors border " +
              (pathname === "/dashboard/admin" || pathname?.startsWith("/dashboard/admin")
                ? "bg-accentsoft border-accent/40 text-primary"
                : "border-transparent text-chalk hover:bg-raised hover:text-primary")
            }
            style={
              pathname === "/dashboard/admin" || pathname?.startsWith("/dashboard/admin")
                ? { background: "rgba(126,200,227,0.14)", borderColor: "rgba(126,200,227,0.4)" }
                : undefined
            }
          >
            Admin
          </Link>
        )}
      </nav>
      <div className="p-3 border-t border-edgesoft">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded bg-raised flex items-center justify-center font-display text-xs font-semibold text-muted flex-shrink-0">
            {user?.name?.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{user?.name}</div>
            <div className="text-[10px] text-faint">{user?.role}</div>
          </div>
        </div>
        <button onClick={logout} className="text-xs underline text-muted text-left hover:text-primary">
          Log out
        </button>
      </div>
    </aside>
  );
}

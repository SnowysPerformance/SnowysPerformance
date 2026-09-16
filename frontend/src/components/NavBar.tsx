"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/athletes", label: "Athletes" },
  { href: "/dashboard/programs", label: "Programs" },
  { href: "/dashboard/workouts", label: "Workouts" },
  { href: "/dashboard/tests", label: "Testing" },
  { href: "/dashboard/fatigue", label: "Fatigue" },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  return (
    <aside className="w-56 bg-slate-900 text-white p-4 flex flex-col">
      <div className="font-semibold mb-6">Snowy's Performance</div>
      <nav className="flex-1 space-y-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="block rounded px-3 py-2 hover:bg-slate-800">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="text-sm text-slate-400 mb-2">
        {user?.name} · {user?.role}
      </div>
      <button onClick={logout} className="text-sm underline text-slate-300 text-left">
        Log out
      </button>
    </aside>
  );
}

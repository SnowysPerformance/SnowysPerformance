"use client";
import { useAuth } from "@/components/AuthProvider";

export default function DashboardHome() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Welcome, {user?.name}</h1>
      <p className="text-slate-500">
        Team ID: <span className="font-mono">{user?.teamId}</span>
        {user?.role === "COACH" && " — share this with athletes so they can register."}
      </p>
    </div>
  );
}

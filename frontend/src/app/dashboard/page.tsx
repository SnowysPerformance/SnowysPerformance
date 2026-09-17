"use client";
import { useAuth } from "@/components/AuthProvider";

export default function DashboardHome() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-2">Welcome, {user?.name}</h1>
      {user?.role === "COACH" && (
        <p className="text-faint text-sm">
          {user?.isHeadCoach ? "You're the head coach of this team." : "You're an assistant coach on this team."}
          {user?.isPlatformAdmin && " You're also the platform admin — see the Admin page."}
        </p>
      )}
    </div>
  );
}

"use client";
import { useAuth } from "@/components/AuthProvider";
import ProgressCharts from "@/components/ProgressCharts";

// Athlete's own Progress page: charts, PRs, and wearable recovery — no
// fatigue/overtraining risk flag, which is a coaching tool, not something
// athletes see about themselves.
export default function MyProgressPage() {
  const { user } = useAuth();
  if (!user) return null;
  return <ProgressCharts athleteId={user.id} showFatigue={false} />;
}

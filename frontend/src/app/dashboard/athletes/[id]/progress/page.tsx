"use client";
import ProgressCharts from "@/components/ProgressCharts";

// Coach's per-athlete Progress tab — full charts, PRs, and fatigue/overtraining
// risk (a coaching tool the athlete themselves doesn't see; see the athlete's
// own /dashboard/progress page for the self-service version).
export default function AthleteProgressTab({ params }: { params: { id: string } }) {
  return <ProgressCharts athleteId={params.id} showFatigue={true} />;
}

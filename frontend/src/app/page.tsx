import type { Metadata } from "next";
import Link from "next/link";
import HomeAuthRedirect from "@/components/HomeAuthRedirect";

export const metadata: Metadata = {
  title: "Snowy's Performance | Sports Performance Coaching Software",
  description:
    "Snowy's Performance is a coaching platform for CSCS-certified sports performance coaches to build training programs, track athlete workouts and personal records, monitor recovery with WHOOP integration, and message athletes — all in one place.",
};

const h2 = "font-display text-xl font-bold mt-10 mb-3 text-primary";
const p = "text-sm text-muted leading-relaxed mb-3";

export default function Home() {
  return (
    <div className="min-h-screen bg-void text-primary">
      <HomeAuthRedirect />
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">❄️</span>
          <span className="font-display font-semibold">Snowy's Performance</span>
        </div>

        <h1 className="font-display text-3xl font-bold mt-6 mb-3">
          Coaching software for sports performance training
        </h1>
        <p className={p}>
          Snowy's Performance helps sports performance coaches build and assign training programs, track athlete
          workouts and personal records, monitor recovery and wearable data, and message athletes — all from one
          platform.
        </p>

        <div className="flex flex-wrap gap-3 mt-6 mb-10">
          <Link
            href="/register"
            className="bg-accent text-accenttext font-semibold rounded px-4 py-2 text-sm hover:bg-accentstrong transition-colors"
          >
            Start coaching
          </Link>
          <Link
            href="/login"
            className="border border-edge text-primary font-semibold rounded px-4 py-2 text-sm hover:border-accent transition-colors"
          >
            Sign in
          </Link>
        </div>

        <h2 className={h2}>Built for coaches, not spreadsheets</h2>
        <p className={p}>
          Design multi-week training programs, assign them to individual athletes or an entire team, and see who's
          on track at a glance. Every set, rep, and weight an athlete logs feeds back into their history automatically.
        </p>

        <h2 className={h2}>Track what matters</h2>
        <p className={p}>
          Log workouts, chart personal records over time, and keep private coaching notes on each athlete visible
          only to your coaching staff.
        </p>

        <h2 className={h2}>Recovery-aware coaching</h2>
        <p className={p}>
          Athletes can connect their WHOOP account to bring recovery score, strain, sleep, and resting heart rate
          into the platform, so training decisions can account for how an athlete is actually recovering.
        </p>

        <h2 className={h2}>Stay connected with your team</h2>
        <p className={p}>
          Message athletes directly in the app, invite new athletes and coaches to your team, and manage
          permissions so the right people see the right data.
        </p>

        <div className="mt-10 pt-6 border-t border-edge flex gap-4 text-sm">
          <Link className="text-accent underline" href="/register">Create an account</Link>
          <Link className="text-accent underline" href="/login">Sign in</Link>
          <Link className="text-accent underline" href="/privacy">Privacy Policy</Link>
          <Link className="text-accent underline" href="/terms">Terms</Link>
        </div>
      </div>
    </div>
  );
}

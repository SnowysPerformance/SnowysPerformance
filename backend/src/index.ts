import "dotenv/config";
import { app } from "./app";
import { prisma } from "./db";
import { computeBestsFromLogs } from "./utils/prs";

const PORT = process.env.PORT || 4000;

// The one platform-owner account. Hardcoded so this works with zero Railway
// configuration — no ADMIN_EMAIL environment variable needed. (An
// ADMIN_EMAIL variable, if one happens to be set, is still honored too, so
// this can be overridden without a code change if the login email ever
// changes.)
const PLATFORM_ADMIN_EMAIL = "markbaseball2325@gmail.com";

// Runs at boot and then on a recurring timer (see setInterval below): makes
// sure the platform-admin account is flagged as the platform admin, so Mark
// never has to touch the database directly to get access to the Admin page.
// It also actively STRIPS the flag from every other account. Nothing in the
// app ever grants isPlatformAdmin to anyone else -- there is no invite,
// signup, or API call that can set it (see admin.controller.ts) -- but this
// is a defense-in-depth backstop: if a bug, a stray manual database edit, or
// someone else's account happening to match a misconfigured ADMIN_EMAIL ever
// left a second admin in place, this check (running hourly, not just at
// boot) removes it again on its own, no restart required.
async function ensurePlatformAdmin() {
  const email = (process.env.ADMIN_EMAIL || PLATFORM_ADMIN_EMAIL).trim().toLowerCase();
  if (!email) return;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`Platform admin email is ${email}, but no account with that email exists yet — log in with that account first, then restart.`);
    } else if (!user.isPlatformAdmin) {
      await prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
      console.log(`Granted platform admin access to ${email}.`);
    }

    const revoked = await prisma.user.updateMany({
      where: { isPlatformAdmin: true, email: { not: email } },
      data: { isPlatformAdmin: false },
    });
    if (revoked.count > 0) {
      console.warn(`Revoked platform admin access from ${revoked.count} account(s) other than ${email}.`);
    }
  } catch (err) {
    console.error("Admin bootstrap check failed:", err);
  }
}

// One-time-per-database backfill: the PersonalRecord table is brand new, so
// every weighted set anyone logged before this feature shipped needs its
// "current all-time best" computed once from history. After that, every new
// log or delete keeps the table current on its own (see workouts.controller
// .ts), so this only ever does real work the first time it runs against a
// given database — it's a no-op on every boot after that.
async function backfillPersonalRecords() {
  try {
    const alreadyPopulated = await prisma.personalRecord.count();
    if (alreadyPopulated > 0) return;

    const pairs = await prisma.workoutLog.groupBy({
      by: ["teamId", "athleteId", "exerciseName"],
      where: { type: "weighted", isWarmup: false },
    });
    if (!pairs.length) return;

    console.log(`Backfilling personal records for ${pairs.length} athlete/exercise pair(s)...`);
    for (const p of pairs) {
      const logs = await prisma.workoutLog.findMany({
        where: { athleteId: p.athleteId, exerciseName: p.exerciseName, type: "weighted", isWarmup: false },
        select: { id: true, date: true, sets: true },
      });
      const bests = computeBestsFromLogs(logs);
      if (bests.bestWeight <= 0 && bests.bestE1rm <= 0) continue;
      await prisma.personalRecord.upsert({
        where: { athleteId_exerciseName: { athleteId: p.athleteId, exerciseName: p.exerciseName } },
        create: { teamId: p.teamId, athleteId: p.athleteId, exerciseName: p.exerciseName, ...bests },
        update: bests,
      });
    }
    console.log("Personal records backfill complete.");
  } catch (err) {
    console.error("Personal records backfill failed:", err);
  }
}

// One-time-per-coach backfill: TeamMembership is brand new, so every coach
// created before multi-team support shipped doesn't have a membership row
// for their own team yet — add one from their current User fields so they
// show up correctly in their own team switcher. Upsert makes this cheap
// and safe to run on every boot: it's a no-op for any coach who already
// has the row (everyone created after this shipped gets it written
// directly, in acceptInvite/createTeam).
async function backfillTeamMemberships() {
  try {
    const coaches = await prisma.user.findMany({
      where: { role: "COACH" },
      select: { id: true, teamId: true, isHeadCoach: true, accessLevel: true },
    });
    for (const c of coaches) {
      await prisma.teamMembership.upsert({
        where: { userId_teamId: { userId: c.id, teamId: c.teamId } },
        update: {},
        create: { userId: c.id, teamId: c.teamId, isHeadCoach: c.isHeadCoach, accessLevel: c.accessLevel },
      });
    }
  } catch (err) {
    console.error("Team membership backfill failed:", err);
  }
}

Promise.all([ensurePlatformAdmin(), backfillPersonalRecords(), backfillTeamMemberships()]).finally(() => {
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
});

// Re-run the admin check hourly for as long as the server stays up, so the
// single-admin guarantee above holds without needing a redeploy/restart.
setInterval(() => {
  ensurePlatformAdmin().catch((err) => console.error("Scheduled admin check failed:", err));
}, 60 * 60 * 1000);

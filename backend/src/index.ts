import "dotenv/config";
import { app } from "./app";
import { prisma } from "./db";

const PORT = process.env.PORT || 4000;

// One-time-per-boot check: if an ADMIN_EMAIL is set in the environment,
// make sure that account (once it exists) is flagged as the platform
// admin, so Mark never has to touch the database directly to get access
// to the Admin page. This only ever ADDS the flag — it never removes it
// from anyone, even if ADMIN_EMAIL later changes or is unset, so a stray
// misconfiguration can't accidentally lock the real admin out.
async function ensurePlatformAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email) return;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`ADMIN_EMAIL is set to ${email}, but no account with that email exists yet — log in with that account first, then restart.`);
      return;
    }
    if (!user.isPlatformAdmin) {
      await prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
      console.log(`Granted platform admin access to ${email}.`);
    }
  } catch (err) {
    console.error("Admin bootstrap check failed:", err);
  }
}

ensurePlatformAdmin().finally(() => {
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
});

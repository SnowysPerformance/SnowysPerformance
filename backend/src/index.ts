import "dotenv/config";
import { app } from "./app";
import { prisma } from "./db";

const PORT = process.env.PORT || 4000;

// The one platform-owner account. Hardcoded so this works with zero Railway
// configuration — no ADMIN_EMAIL environment variable needed. (An
// ADMIN_EMAIL variable, if one happens to be set, is still honored too, so
// this can be overridden without a code change if the login email ever
// changes.)
const PLATFORM_ADMIN_EMAIL = "markbaseball2325@gmail.com";

// One-time-per-boot check: make sure the platform-admin account (once it
// exists) is flagged as the platform admin, so Mark never has to touch the
// database directly to get access to the Admin page. This only ever ADDS
// the flag — it never removes it from anyone, so a stray misconfiguration
// can't accidentally lock the real admin out.
async function ensurePlatformAdmin() {
  const email = (process.env.ADMIN_EMAIL || PLATFORM_ADMIN_EMAIL).trim().toLowerCase();
  if (!email) return;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log("Platform admin email is " + email + ", but no account with that email exists yet — log in with that account first, then restart.");
      return;
    }
    if (!user.isPlatformAdmin) {
      await prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
      console.log("Granted platform admin access to " + email + ".");
    }
  } catch (err) {
    console.error("Admin bootstrap check failed:", err);
  }
}

ensurePlatformAdmin().finally(() => {
  app.listen(PORT, () => console.log("API listening on http://localhost:" + PORT));
});

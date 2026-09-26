import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes";
import teamRoutes from "./routes/teams.routes";
import workoutRoutes from "./routes/workouts.routes";
import testRoutes from "./routes/tests.routes";
import programRoutes from "./routes/programs.routes";
import fatigueRoutes from "./routes/fatigue.routes";
import integrationRoutes from "./routes/integrations.routes";
import libraryRoutes from "./routes/library.routes";
import testTypeRoutes from "./routes/testTypes.routes";
import dataTransferRoutes from "./routes/dataTransfer.routes";
import inviteRoutes from "./routes/invites.routes";
import coachRoutes from "./routes/coaches.routes";
import adminRoutes from "./routes/admin.routes";
import messageRoutes from "./routes/messages.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";

export const app = express();

app.use(
  helmet({
    // This API is deliberately called cross-origin, by the separate
         // Next.js frontend on a different domain -- helmet's default
         // Cross-Origin-Resource-Policy: same-origin would silently block
         // every one of those browser fetches.
         crossOriginResourcePolicy: { policy: "cross-origin" },
  })
  );

// Only our own frontend(s) may call this API directly from a browser.
// (This doesn't affect the WHOOP/Garmin webhooks or the WHOOP OAuth
// callback -- those are server-to-server calls and a plain browser
// redirect, neither of which CORS applies to.)
const allowedOrigins = [
  "https://www.snowysperformance.com",
  "https://snowysperformance.com",
  process.env.FRONTEND_URL,
  ].filter((v): v is string => Boolean(v));

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  // Vercel gives every preview deployment (each branch/PR) its own unique
// *.vercel.app subdomain -- allow those too so a preview build can still
// reach the API while testing, without needing a code change every time.
try {
  return new URL(origin).hostname.endsWith(".vercel.app");
} catch {
  return false;
}
}

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header at all (server-to-server calls, curl, some
    // mobile/native clients) isn't something CORS governs -- only the
    // browser-facing allowlist check applies when an Origin is present.
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  })
  );

app.use(
  express.json({
    // Stash the raw request bytes so webhook handlers (e.g. WHOOP) can
               // verify a provider's HMAC signature against exactly what they signed,
               // not our re-serialized parse of them.
               verify: (req: any, _res, buf) => {
                 req.rawBody = buf;
               },
  })
  );

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/fatigue", fatigueRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/test-types", testTypeRoutes);
app.use("/api/data", dataTransferRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/coaches", coachRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

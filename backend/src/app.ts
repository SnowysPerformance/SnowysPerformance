import express from "express";
import cors from "cors";
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

export const app = express();

app.use(cors());
app.use(express.json());

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

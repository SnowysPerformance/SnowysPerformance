import { Router } from "express";
import * as ctrl from "../controllers/leaderboard.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
// Coaches and athletes can both view — always limited to their own team.
router.get("/team", ctrl.getTeamLeaderboard);

export default router;

import { Router } from "express";
import * as ctrl from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimit";

const router = Router();
router.post("/login", loginLimiter, ctrl.login);
router.get("/me", authenticate, ctrl.me);
router.patch("/me", authenticate, ctrl.updateMe);
router.post("/change-password", authenticate, ctrl.changePassword);

// Multi-team support for coaches: list the teams you belong to, start a
// brand-new one of your own, or switch which one is currently active.
router.get("/teams", authenticate, ctrl.listMyTeams);
router.post("/teams", authenticate, ctrl.createTeam);
router.post("/teams/:teamId/switch", authenticate, ctrl.switchTeam);

export default router;

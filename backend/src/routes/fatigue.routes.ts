import { Router } from "express";
import * as ctrl from "../controllers/fatigue.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.get("/team", ctrl.getTeamFatigue);
router.get("/:athleteId", ctrl.getAthleteFatigue);

export default router;

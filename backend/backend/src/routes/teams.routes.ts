import { Router } from "express";
import * as ctrl from "../controllers/teams.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.get("/me/athletes", authenticate, ctrl.listAthletes);

export default router;

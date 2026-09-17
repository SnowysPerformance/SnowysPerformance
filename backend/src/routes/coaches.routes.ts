import { Router } from "express";
import * as ctrl from "../controllers/coaches.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Coach-only: view/manage the co-coaches on your own team.
router.get("/", authenticate, ctrl.listCoaches);
router.patch("/:id", authenticate, ctrl.updateCoachAccess);

export default router;

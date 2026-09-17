import { Router } from "express";
import * as ctrl from "../controllers/messages.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/:athleteId", authenticate, ctrl.listMessages);
router.post("/:athleteId", authenticate, ctrl.sendMessage);

export default router;

import { Router } from "express";
import * as ctrl from "../controllers/invites.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Coach-only invite management.
router.post("/", authenticate, ctrl.createInvite);
router.get("/", authenticate, ctrl.listInvites);
router.delete("/:id", authenticate, ctrl.revokeInvite);

// Public — the person accepting an invite doesn't have an account yet.
router.get("/token/:token", ctrl.getInviteByToken);
router.post("/accept", ctrl.acceptInvite);

export default router;

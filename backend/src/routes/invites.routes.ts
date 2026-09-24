import { Router } from "express";
import * as ctrl from "../controllers/invites.controller";
import { authenticate } from "../middleware/auth";
import { inviteLimiter } from "../middleware/rateLimit";

const router = Router();

// Coach-only invite management.
router.post("/", authenticate, ctrl.createInvite);
router.get("/", authenticate, ctrl.listInvites);
router.delete("/:id", authenticate, ctrl.revokeInvite);

// Public -- the person accepting an invite doesn't have an account yet.
router.get("/token/:token", inviteLimiter, ctrl.getInviteByToken);
router.post("/accept", inviteLimiter, ctrl.acceptInvite);

export default router;

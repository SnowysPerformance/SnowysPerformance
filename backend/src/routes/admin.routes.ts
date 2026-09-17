import { Router } from "express";
import * as ctrl from "../controllers/admin.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Every route here re-checks isPlatformAdmin itself (see admin.controller's
// ensureAdmin) — authenticate just confirms there's a valid, non-suspended
// login at all.
router.get("/teams", authenticate, ctrl.listTeams);
router.get("/invites", authenticate, ctrl.listHeadCoachInvites);
router.post("/invites", authenticate, ctrl.inviteHeadCoach);
router.delete("/invites/:id", authenticate, ctrl.revokeHeadCoachInvite);
router.patch("/head-coaches/:id/suspend", authenticate, ctrl.setHeadCoachSuspended);
router.delete("/head-coaches/:id", authenticate, ctrl.deleteHeadCoach);

export default router;

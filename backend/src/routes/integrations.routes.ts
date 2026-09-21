import { Router } from "express";
import * as ctrl from "../controllers/integrations.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Athlete-initiated OAuth linking (needs a logged-in athlete)
router.get("/whoop/authorize", authenticate, ctrl.whoopAuthorizeUrl);
router.get("/whoop/status", authenticate, ctrl.whoopStatus);
router.delete("/whoop", authenticate, ctrl.whoopDisconnect);
router.post("/healthkit/ingest", authenticate, ctrl.healthKitIngest);
router.get("/wearable/:athleteId", authenticate, ctrl.getWearableHistory);

// Provider-initiated webhooks (no platform auth — these come from WHOOP/Garmin's
// own servers; verify their signatures in production instead)
router.get("/whoop/callback", ctrl.whoopCallback);
router.post("/whoop/webhook", ctrl.whoopWebhook);
router.post("/garmin/webhook", ctrl.garminWebhook);

export default router;

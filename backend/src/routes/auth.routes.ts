import { Router } from "express";
import * as ctrl from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.post("/login", ctrl.login);
router.get("/me", authenticate, ctrl.me);
router.patch("/me", authenticate, ctrl.updateMe);
router.post("/change-password", authenticate, ctrl.changePassword);

export default router;

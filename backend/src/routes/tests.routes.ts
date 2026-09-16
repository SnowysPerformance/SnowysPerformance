import { Router } from "express";
import * as ctrl from "../controllers/tests.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.post("/", ctrl.createTestResult);
router.get("/", ctrl.listTestResults);
router.delete("/:id", ctrl.deleteTestResult);

export default router;

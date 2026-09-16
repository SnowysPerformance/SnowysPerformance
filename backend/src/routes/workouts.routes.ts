import { Router } from "express";
import * as ctrl from "../controllers/workouts.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.post("/", ctrl.createWorkoutLog);
router.get("/", ctrl.listWorkoutLogs);
router.delete("/:id", ctrl.deleteWorkoutLog);

export default router;

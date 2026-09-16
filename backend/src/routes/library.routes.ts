import { Router } from "express";
import * as ctrl from "../controllers/library.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.get("/", ctrl.listExercises);
router.post("/", ctrl.addExercise);
router.patch("/:id", ctrl.updateExercise);
router.delete("/:id", ctrl.deleteExercise);

export default router;

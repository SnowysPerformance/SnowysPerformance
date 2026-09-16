import { Router } from "express";
import * as ctrl from "../controllers/programs.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.post("/", ctrl.createProgram);
router.get("/", ctrl.listPrograms);
router.get("/:id", ctrl.getProgram);
router.delete("/:id", ctrl.deleteProgram);
router.post("/:id/weeks", ctrl.addWeek);
router.post("/weeks/:weekId/days", ctrl.addDay);
router.post("/days/:dayId/exercises", ctrl.addExercise);
router.post("/:id/assign", ctrl.assignProgram);
router.delete("/:id/assign/:athleteId", ctrl.unassignProgram);

export default router;

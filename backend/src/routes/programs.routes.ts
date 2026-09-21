import { Router } from "express";
import * as ctrl from "../controllers/programs.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.post("/", ctrl.createProgram);
router.get("/", ctrl.listPrograms);
router.get("/:id", ctrl.getProgram);
router.delete("/:id", ctrl.deleteProgram);
router.post("/:id/assign", ctrl.assignProgram);
router.delete("/:id/assign/:athleteId", ctrl.unassignProgram);

router.post("/:id/phases", ctrl.addPhase);
router.patch("/phases/:phaseId", ctrl.updatePhase);
router.delete("/phases/:phaseId", ctrl.deletePhase);

router.post("/phases/:phaseId/weeks", ctrl.addWeek);
router.patch("/weeks/:weekId", ctrl.updateWeek);
router.post("/weeks/:weekId/duplicate", ctrl.duplicateWeek);
router.delete("/weeks/:weekId", ctrl.deleteWeek);

router.post("/days/:dayId/exercises", ctrl.addExercise);
router.patch("/exercises/:exerciseId", ctrl.updateExercise);
router.delete("/exercises/:exerciseId", ctrl.deleteExercise);
router.post("/days/:dayId/reorder", ctrl.reorderExercises);

router.post("/days/:dayId/group", ctrl.groupExercises);
router.post("/days/:dayId/group/:groupId/ungroup", ctrl.ungroupExercises);

export default router;

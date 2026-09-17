import { Router } from "express";
import * as ctrl from "../controllers/teams.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.get("/me/athletes", authenticate, ctrl.listAthletes);
router.post("/me/athletes", authenticate, ctrl.createAthlete);
router.get("/me/athletes/:id", authenticate, ctrl.getAthlete);
router.patch("/me/athletes/:id", authenticate, ctrl.updateAthlete);
router.patch("/me/athletes/:id/notes", authenticate, ctrl.updateAthleteNotes);
router.delete("/me/athletes/:id", authenticate, ctrl.deleteAthlete);

export default router;

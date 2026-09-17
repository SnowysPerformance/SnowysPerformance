import { Router } from "express";
import * as ctrl from "../controllers/dataTransfer.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.get("/export/team", ctrl.exportTeam);
router.get("/export/athlete/:id", ctrl.exportAthlete);
router.get("/export/program/:id", ctrl.exportProgram);
router.post("/import", ctrl.importData);

export default router;

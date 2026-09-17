import { Router } from "express";
import * as ctrl from "../controllers/testTypes.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.get("/", ctrl.listTestTypes);
router.post("/", ctrl.addTestType);
router.delete("/:id", ctrl.deleteTestType);

export default router;

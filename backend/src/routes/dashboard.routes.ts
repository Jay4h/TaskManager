import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const dashboardController = new DashboardController();

router.use(authMiddleware);
router.get("/stats", (req, res) => dashboardController.getStats(req, res));

export default router;

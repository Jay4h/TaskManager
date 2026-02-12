import { Router } from "express";
import { TasksController } from "../controllers/tasks.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const tasksController = new TasksController();

router.use(authMiddleware);
router.post("/", (req, res) => tasksController.createTask(req, res));
router.get("/", (req, res) => tasksController.getTasks(req, res));
router.get("/:id/details", (req, res) => tasksController.getTaskDetails(req, res));
router.put("/:id/details/:index", (req, res) => tasksController.updateTaskDetail(req, res));
router.patch("/:id/status", (req, res) => tasksController.updateTaskStatus(req, res));
export default router;

import { Request, Response } from "express";
import { TasksService } from "../services/tasks.service";
import type { CreateTaskRequest } from "../shared/types";

export class TasksController {
  private tasksService: TasksService;

  constructor() {
    this.tasksService = new TasksService();
  }

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as Partial<CreateTaskRequest>;

      if (!body.taskName || typeof body.taskName !== "string") {
        res.status(400).json({ error: "taskName is required" });
        return;
      }

      if (typeof body.hours !== "number" || Number.isNaN(body.hours)) {
        res.status(400).json({ error: "hours (number) is required" });
        return;
      }

      if (body.hours < 0) {
        res.status(400).json({ error: "hours must be >= 0" });
        return;
      }

      if (!Array.isArray(body.details) || body.details.length === 0) {
        res.status(400).json({ error: "details must be a non-empty array" });
        return;
      }

      const result = await this.tasksService.createTask(body as CreateTaskRequest);
      res.status(201).json(result);
    } catch (error) {
      console.error("Create task error:", error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  }

  async getTasks(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.tasksService.getTasks();
      res.json(result);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }

  async getTaskDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.tasksService.getTaskDetails(id);
      res.json(result);
    } catch (error) {
      console.error("Get task details error:", error);
      if (error instanceof Error && error.message === "Invalid id") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  }
}

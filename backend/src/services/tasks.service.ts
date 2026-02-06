import { TaskModel } from "../models/task.model";
import type { CreateTaskRequest, DetailBlock } from "../shared/types";

function isValidTimeHHMM(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^\d{2}:\d{2}$/.test(value);
}

export class TasksService {
  private taskModel: TaskModel;

  constructor() {
    this.taskModel = new TaskModel();
  }

  async createTask(data: CreateTaskRequest): Promise<any> {
    // Check if task name already exists
    const existingTask = await this.taskModel.findByTaskName(data.taskName.trim());
    if (existingTask) {
      throw new Error("Task name already exists. Please use a unique name.");
    }

    // Validate and clean details
    const cleanedDetails: DetailBlock[] = [];
    for (let i = 0; i < data.details.length; i++) {
      const d = data.details[i] as Partial<DetailBlock>;
      const text = typeof d.text === "string" ? d.text.trim() : "";
      if (!text) continue;

      if (!isValidTimeHHMM(d.time)) {
        throw new Error(`details[${i}] must include a valid time (HH:MM)`);
      }

      cleanedDetails.push({ text, time: d.time });
    }

    if (cleanedDetails.length === 0) {
      throw new Error("At least one detail with text is required");
    }

    // Create task document
    const taskData = {
      taskName: data.taskName.trim(),
      details: cleanedDetails,
      hours: data.hours,
      createdAt: new Date(),
    };

    const result = await this.taskModel.create(taskData);

    return {
      ok: true,
      insertedId: result.insertedId,
      task: result.task,
    };
  }

  async getTasks(): Promise<any> {
    const items = await this.taskModel.findAll(100);
    return { success: true, data: items, message: "Tasks retrieved successfully" };
  }

  async getTaskDetails(id: string): Promise<any> {
    const rawId = typeof id === "string" ? id.trim() : "";

    // Validate ID format
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(rawId);
    const isValidNumber = /^\d+$/.test(rawId) && Number(rawId) > 0;

    if (!isValidObjectId && !isValidNumber) {
      throw new Error("Invalid id");
    }

    const details = await this.taskModel.getDetails(rawId);
    return { ok: true, details };
  }
}

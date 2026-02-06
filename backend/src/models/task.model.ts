import mongoose, { Schema, Document, Model } from "mongoose";
import type { DetailBlock } from "../shared/types";

export interface TaskDocument extends Document {
    taskName: string;
    hours: number;
    details: DetailBlock[];
    createdAt: Date;
}

export interface TaskListItem {
    _id: string;
    taskName: string;
    hours: number;
    createdAt: Date;
    detailsCount: number;
    no: number;
}

const detailBlockSchema = new Schema<DetailBlock>(
    {
        text: { type: String, required: true },
        time: { type: String, required: true },
    },
    { _id: false }
);

const taskSchema = new Schema<TaskDocument>(
    {
        taskName: { type: String, required: true, trim: true },
        hours: { type: Number, required: true },
        details: { type: [detailBlockSchema], default: [] },
    },
    {
        timestamps: true,
        collection: "TaskManager",
    }
);

// Create indexes
taskSchema.index({ taskName: 1 });
taskSchema.index({ createdAt: -1 });

const Task = mongoose.models.TaskManager || mongoose.model<TaskDocument>("TaskManager", taskSchema);

export class TaskModel {
    private model: Model<TaskDocument>;

    constructor() {
        this.model = Task;
    }

    /**
     * Find a task by its name
     */
    async findByTaskName(taskName: string): Promise<TaskDocument | null> {
        return this.model.findOne({ taskName: taskName.trim() });
    }

    /**
     * Create a new task
     */
    async create(taskData: Omit<TaskDocument, "_id" | "createdAt" | keyof Document>): Promise<{ insertedId: string; task: TaskDocument }> {
        const task = await this.model.create(taskData);
        return {
            insertedId: task._id.toString(),
            task,
        };
    }

    /**
     * Get all tasks with aggregation (sorted by createdAt, limited)
     */
    async findAll(limit: number = 100): Promise<TaskListItem[]> {
        const items = await this.model
            .aggregate([
                {
                    $project: {
                        _id: { $toString: "$_id" },
                        taskName: 1,
                        hours: 1,
                        createdAt: 1,
                        detailsCount: { $size: { $ifNull: ["$details", []] } },
                    },
                },
                { $sort: { createdAt: -1 } },
                { $limit: limit },
            ])
            .exec();

        // Add sequential number
        return items.map((item, index) => ({
            ...item,
            no: index + 1,
        })) as TaskListItem[];
    }

    async findById(id: string): Promise<TaskDocument | null> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null;
        }
        return this.model.findById(id);
    }

    async findBySequenceNumber(no: number): Promise<TaskDocument | null> {
        if (no <= 0 || !Number.isInteger(no)) {
            return null;
        }

        return this.model
            .findOne({})
            .sort({ createdAt: -1 })
            .skip(no - 1)
            .limit(1);
    }

    async getDetails(id: string): Promise<DetailBlock[]> {
        const rawId = id.trim();
        const isObjectId = mongoose.Types.ObjectId.isValid(rawId);
        const numericNo = /^\d+$/.test(rawId) ? Number(rawId) : NaN;

        let task: TaskDocument | null = null;

        if (isObjectId) {
            task = await this.model.findById(rawId).select("details");
        } else if (!Number.isNaN(numericNo) && numericNo > 0) {
            task = await this.model
                .findOne({})
                .select("details")
                .sort({ createdAt: -1 })
                .skip(numericNo - 1)
                .limit(1);
        }
        return Array.isArray(task?.details) ? task.details : [];
    }
}

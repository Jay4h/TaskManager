export interface DetailBlock {
  text: string;
  hours?: number;
  minutes?: number;
  time?: string; // HH:MM format
}

export interface Task {
  _id: string;
  taskName: string;
  hours: number;
  details: DetailBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  taskName: string;
  hours: number;
  details: DetailBlock[];
}

export interface GetTasksResponse {
  success: boolean;
  data: Task[];
  message: string;
}

export interface TaskDetailsResponse {
  ok: boolean;
  details: DetailBlock[];
  message: string;
}

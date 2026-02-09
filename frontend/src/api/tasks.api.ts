import { api } from "./http";
import type { CreateTaskRequest, GetTasksResponse, TaskDetailsResponse } from "../types/task";

export const tasksApi = {
  createTask: async (data: CreateTaskRequest) => {
    const response = await api.post("/tasks", data);
    return response.data;
  },
  
  getTasks: async (page: number = 1, limit: number = 10) => {
    const response = await api.get<GetTasksResponse>("/tasks", {
      params: { page, limit }
    });
    return response.data;
  },
  
  getTaskDetails: async (id: string) => {
    const response = await api.get<TaskDetailsResponse>(`/tasks/${id}/details`);
    return response.data;
  },
};

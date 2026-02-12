import { api } from "./http";
import type { CreateProjectRequest, ProjectsResponse, AllUsersResponse } from "../types/project";

export const projectsApi = {
  // Create a new project (admin only)
  createProject: async (data: CreateProjectRequest) => {
    const response = await api.post("/projects", data);
    return response.data;
  },

  // Get all projects (admin only)
  getAllProjects: async (): Promise<ProjectsResponse> => {
    const response = await api.get("/projects");
    return response.data;
  },

  // Get projects assigned to current user
  getMyProjects: async (): Promise<ProjectsResponse> => {
    const response = await api.get("/projects/my-projects");
    return response.data;
  },

  // Get all users for dropdown
  getAllUsersForDropdown: async (): Promise<AllUsersResponse> => {
    const response = await api.get("/projects/users/all");
    return response.data;
  },

  // Get projects for a specific user (admin only)
  getProjectsForUser: async (userId: string): Promise<ProjectsResponse> => {
    const response = await api.get(`/projects/user/${userId}`);
    return response.data;
  },

  // Update a project (admin only)
  updateProject: async (projectId: string, data: Partial<CreateProjectRequest>) => {
    const response = await api.put(`/projects/${projectId}`, data);
    return response.data;
  },

  // Delete a project (admin only)
  deleteProject: async (projectId: string) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },
};

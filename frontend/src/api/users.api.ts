import { api } from "./http";
import type { CreateUserRequest, CreateUserResponse, UsersResponse } from "../types/user";

export const usersApi = {
  // Create a new user (admin only)
  createUser: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    const response = await api.post("/users", data);
    return response.data;
  },

  // Get all users (admin only)
  getAllUsers: async (page: number = 1, limit: number = 10): Promise<UsersResponse> => {
    const response = await api.get("/users", {
      params: { page, limit }
    });
    return response.data;
  },

  // Delete a user (admin only)
  deleteUser: async (userId: string) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },
};

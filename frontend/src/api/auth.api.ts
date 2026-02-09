import { api } from "./http";
import type { LoginRequest, AuthResponse } from "../types/auth";

export const authApi = {
  register: async (data: LoginRequest) => {
    const response = await api.post<AuthResponse>("/auth/register", data);
    return response.data;
  },
  
  login: async (email: string, password: string) => {
    const response = await api.post<AuthResponse>("/auth/login ", { email, password });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const response = await api.post<{ success: boolean; message: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },
};

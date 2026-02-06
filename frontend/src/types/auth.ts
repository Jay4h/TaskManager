export interface LoginRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  message: string;
}

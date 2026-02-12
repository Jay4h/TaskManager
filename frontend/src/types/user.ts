export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: "admin" | "user";
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserResponse {
  success: boolean;
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "admin" | "user";
  };
  message: string;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  message: string;
}

export interface AllUsersResponse {
  success: boolean;
  data: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  }>;
  message: string;
}

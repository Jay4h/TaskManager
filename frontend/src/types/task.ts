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

export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetTasksResponse {
  success: boolean;
  data: Task[];
  pagination: PaginationMetadata;
  message: string;
}

export interface TaskDetailsResponse {
  ok: boolean;
  details: DetailBlock[];
  message: string;
}

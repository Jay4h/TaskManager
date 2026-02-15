import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
// Remove trailing slash to prevent double slashes
const normalizedBase = API_BASE.replace(/\/$/, '');
const API_URL = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`;

export const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


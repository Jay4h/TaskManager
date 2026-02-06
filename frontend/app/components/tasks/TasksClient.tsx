"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import TaskTable from "./TaskTable";
import AddTaskForm from "./AddTaskForm";
import { tasksApi } from "../../../src/api/tasks.api";
import type { Task } from "../../../src/types/task";

export default function TasksClient() {
  const [items, setItems] = useState<Task[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const tasks = await tasksApi.getTasks();
      setItems(tasks.success ? tasks.data : []);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth status
  const checkAuth = () => {
    const token = localStorage.getItem("token");
    return !!token;
  };

  // Initialize on mount
  useEffect(() => {
    if (checkAuth()) {
      setIsLoggedIn(true);
      loadTasks();
    } else {
      setIsLoggedIn(false);
      setIsLoading(false);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isLoggedIn: boolean }>
      const hasToken = customEvent.detail.isLoggedIn;
      setIsLoggedIn(hasToken);
      
      if (hasToken) {
        loadTasks();
      } else {
        setItems([]);
        queryClient.clear();
      }
    };

    window.addEventListener("authStateChanged", handleAuthChange);
    return () => window.removeEventListener("authStateChanged", handleAuthChange);
  }, [queryClient]);

  if (isLoading) return <div className="text-center py-8 text-gray-600">Loading...</div>;
  if (!isLoggedIn) return <div className="text-center py-8 text-gray-600">Please login to view tasks</div>;

  return (
    <>
      <AddTaskForm onAdded={loadTasks} queryClient={queryClient} />
      <TaskTable items={items} />
    </>
  );
}

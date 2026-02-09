"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import TaskTable from "./TaskTable";
import AddTaskForm from "./AddTaskForm";

export default function TasksClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check auth status
  const checkAuth = () => {
    const token = localStorage.getItem("token");
    return !!token;
  };

  // Initialize on mount
  useEffect(() => {
    setIsLoggedIn(checkAuth());
    setIsLoading(false);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isLoggedIn: boolean }>
      const hasToken = customEvent.detail.isLoggedIn;
      setIsLoggedIn(hasToken);
      
      if (!hasToken) {
        queryClient.clear();
      }
    };

    window.addEventListener("authStateChanged", handleAuthChange);
    return () => window.removeEventListener("authStateChanged", handleAuthChange);
  }, [queryClient]);

  const handleTaskAdded = () => {
    // Invalidate tasks query to refetch with current pagination
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  if (isLoading) return <div className="text-center py-8 text-gray-600">Loading...</div>;
  if (!isLoggedIn) return <div className="text-center py-8 text-gray-600">Please login to view tasks</div>;

  return (
    <>
      <AddTaskForm onAdded={handleTaskAdded} queryClient={queryClient} />
      <TaskTable />
    </>
  );
}

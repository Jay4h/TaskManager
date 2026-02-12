"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../../../src/api/projects.api";
import type { CreateProjectRequest } from "../../../src/types/project";

interface AddProjectFormProps {
  users: Array<{ _id: string; firstName: string; lastName: string; email: string; fullName: string }>;
  onSuccess?: () => void;
}

export default function AddProjectForm({ users, onSuccess }: AddProjectFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateProjectRequest>({
    projectName: "",
    projectDescription: "",
    assignedUsers: [],
  });
  const [error, setError] = useState("");

  const createProjectMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setFormData({ projectName: "", projectDescription: "", assignedUsers: [] });
      setError("");
      onSuccess?.();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || "Failed to create project");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (!formData.projectDescription.trim()) {
      setError("Project description is required");
      return;
    }

    createProjectMutation.mutate(formData);
  };

  const toggleUser = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter((id) => id !== userId)
        : [...prev.assignedUsers, userId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Name
        </label>
        <input
          type="text"
          value={formData.projectName}
          onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter project name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Description
        </label>
        <textarea
          value={formData.projectDescription}
          onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter project description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assign Users
        </label>
        <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
          {users.length === 0 ? (
            <p className="text-gray-500 text-sm">No users available</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <label key={user._id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.assignedUsers.includes(user._id)}
                    onChange={() => toggleUser(user._id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {user.fullName} ({user.email})
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={createProjectMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {createProjectMutation.isPending ? "Creating..." : "Create Project"}
      </button>
    </form>
  );
}

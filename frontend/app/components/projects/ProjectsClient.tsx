"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { projectsApi } from "../../../src/api/projects.api";
import AddProjectForm from "./AddProjectForm";
import type { Project } from "../../../src/types/project";

export default function ProjectsClient({ userRole }: { userRole?: "admin" | "user" }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const isAdmin = userRole === "admin";

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", userRole],
    queryFn: isAdmin ? projectsApi.getAllProjects : projectsApi.getMyProjects,
    enabled: !!userRole,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache data to avoid refetching on tab switches
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-dropdown"],
    queryFn: projectsApi.getAllUsersForDropdown,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const deleteProjectMutation = useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const handleDelete = (projectId: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  if (projectsLoading) {
    return <div className="text-center py-8">Loading projects...</div>;
  }

  const projects = projectsData?.data || [];
  const users = usersData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{isAdmin ? "All Projects" : "My Projects"}</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? "Cancel" : "Add Project"}
          </button>
        )}
      </div>

      {showAddForm && isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
          <AddProjectForm users={users} onSuccess={() => setShowAddForm(false)} />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No projects found
          </div>
        ) : (
          projects.map((project: Project) => (
            <div key={project._id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-semibold text-gray-900">{project.projectName}</h3>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(project._id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>

              <p className="text-gray-600 mb-4">{project.projectDescription}</p>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Created by:</span>{" "}
                  <span className="text-gray-600">
                    {project.createdBy?.firstName} {project.createdBy?.lastName}
                  </span>
                </div>

                <div className="text-sm">
                  <span className="font-medium text-gray-700">Assigned Users:</span>
                  {project.assignedUsers?.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {project.assignedUsers.map((user) => (
                        <div key={user._id} className="text-gray-600 text-xs">
                          • {user.firstName} {user.lastName}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs ml-1">No users assigned</span>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-3">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

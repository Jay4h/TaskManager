"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { usersApi } from "../../../src/api/users.api";
import AddUserForm from "./AddUserForm";
import type { User } from "../../../src/types/user";

export default function UsersClient() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", currentPage, itemsPerPage],
    queryFn: () => usersApi.getAllUsers(currentPage, itemsPerPage),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const deleteUserMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to delete user");
    },
  });

  const handleDelete = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const users = usersData?.data || [];
  const pagination = usersData?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  const handlePrevious = () => {
    if (pagination.hasPreviousPage) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNext = () => {
    if (pagination.hasNextPage) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handlePageClick = (page: number) => setCurrentPage(page);

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxButtons = 5;
    const totalPages = pagination.totalPages;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const endIndex = Math.min(
    pagination.currentPage * pagination.itemsPerPage,
    pagination.totalItems
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Create New User</h2>
          <AddUserForm onSuccess={() => setShowAddForm(false)} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user: User) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalItems > 0 && (
        <div className="bg-white px-6 py-4 rounded-b-lg shadow-md border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex}</span> to{" "}
              <span className="font-medium">{endIndex}</span> of{" "}
              <span className="font-medium">{pagination.totalItems}</span> results
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevious}
                disabled={!pagination.hasPreviousPage}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <div className="hidden sm:flex items-center gap-1">
                {getPageNumbers().map((page, index) =>
                  typeof page === "string" ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                      {page}
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageClick(page)}
                      className={[
                        "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium shadow-sm transition",
                        currentPage === page
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={!pagination.hasNextPage}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="w-40">
              <label htmlFor="itemsPerPage" className="sr-only">
                Items per page
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// components/tasks/TaskTable.tsx
"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "../../../src/api/tasks.api";

export type TaskDetail = {
  text: string;
  time: string; // "HH:MM"
};

export type Task = {
  _id: string;
  taskName: string;
  hours: number;
  createdAt?: string;
  detailsCount?: number;
  no?: number;
};

const stickyNoteThemes = [
  {
    card: "bg-amber-200",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
  {
    card: "bg-orange-300",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
  {
    card: "bg-lime-200",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
  {
    card: "bg-violet-300",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
  {
    card: "bg-sky-300",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
] as const;

export default function TaskTable() {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch tasks with server-side pagination
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tasks", currentPage, itemsPerPage],
    queryFn: () => tasksApi.getTasks(currentPage, itemsPerPage),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const items = data?.data || [];
  const pagination = data?.pagination || {
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
    <div className="w-full">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700">
              <tr>
                <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  No
                </th>
                <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  Task Name
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  Details
                </th>
                <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  Hours
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-500" colSpan={4}>
                    Loading tasks...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td className="px-4 py-10 text-center text-red-500" colSpan={4}>
                    Failed to load tasks. Please try again.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-500" colSpan={4}>
                    No tasks yet.
                  </td>
                </tr>
              ) : (
                items.map((t) => (
                  <TaskRow
                    key={t._id}
                    task={t}
                    expandedTaskId={expandedTaskId}
                    setExpandedTaskId={setExpandedTaskId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && !isError && pagination.totalItems > 0 && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-medium text-gray-900">
              {startIndex}
            </span>{" "}
            –{" "}
            <span className="font-medium text-gray-900">
              {endIndex}
            </span>{" "}
            of <span className="font-medium text-gray-900">{pagination.totalItems}</span>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={!pagination.hasPreviousPage}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, idx) =>
                  page === "..." ? (
                    <span
                      key={idx}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-400"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={idx}
                      onClick={() => handlePageClick(page as number)}
                      aria-current={currentPage === page ? "page" : undefined}
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

type TaskRowProps = {
  task: Task;
  expandedTaskId: string | null;
  setExpandedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
};

function TaskRow({ task, expandedTaskId, setExpandedTaskId }: TaskRowProps) {
  const isExpanded = expandedTaskId === task._id;
  const lookupId = task._id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["task-details", lookupId],
    queryFn: () => tasksApi.getTaskDetails(lookupId),
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  });

  const details = Array.isArray(data?.details) ? data.details : [];
  const firstDetail = details[0]?.text ?? "";
  const countLabel =
    typeof task.detailsCount === "number" ? task.detailsCount : details.length;

  return (
    <>
      <tr
        onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
        className="cursor-pointer transition hover:bg-gray-50"
      >
        <td className="whitespace-nowrap px-4 py-3 align-top text-gray-500">
          {task.no || "—"}
        </td>

        <td className="px-4 py-3 align-top font-medium text-gray-900">
          {task.taskName}
        </td>

        <td className="px-4 py-3 align-top">
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{firstDetail || "—"}</span>
            {countLabel > 1 ? (
              <span className="text-xs text-gray-500">
                {countLabel} items • click to expand
              </span>
            ) : (
              <span className="text-xs text-gray-400">click to expand</span>
            )}
          </div>
        </td>

        <td className="whitespace-nowrap px-4 py-3 align-top text-gray-700">
          {task.hours}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={4} className="bg-gray-50 px-4 py-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {task.taskName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Task Details • <span className="font-medium">{task.hours}h</span>{" "}
                    total
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedTaskId(null);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              {isLoading ? (
                <div className="text-sm text-gray-500">Loading details…</div>
              ) : isError ? (
                <div className="text-sm text-red-600">Failed to load details.</div>
              ) : details.length === 0 ? (
                <div className="text-sm text-gray-500">No details available.</div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {details.map((d, i) => {
                    const theme = stickyNoteThemes[i % stickyNoteThemes.length];

                    return (
                      <div
                        key={`${task._id}-detail-${i}`}
                        className={[
                          "relative h-56 w-full overflow-hidden",
                          "rounded-3xl shadow-md",
                          "p-6",
                          theme.card,
                        ].join(" ")}
                      >
                        {/* Top right star button */}
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-neutral-900/90 text-white shadow-sm transition hover:bg-neutral-900"
                          aria-label="Favorite"
                          title="Favorite"
                        >
                          ★
                        </button>

                        {/* Main text */}
                        <p
                          className={[
                            "pr-14 text-lg font-semibold leading-snug",
                            theme.text,
                          ].join(" ")}
                        >
                          {d.text}
                        </p>

                        {/* Bottom-left time/date */}
                        <div className="absolute bottom-5 left-6">
                          <span
                            className={[
                              "text-sm font-medium opacity-80",
                              theme.text,
                            ].join(" ")}
                          >
                            {d.time}
                          </span>
                        </div>

                        {/* Bottom-right edit button */}
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-neutral-900/90 text-white shadow-sm transition hover:bg-neutral-900"
                          aria-label="Edit"
                          title="Edit"
                        >
                          ✎
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

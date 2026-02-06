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

type TaskTableProps = {
  items: Task[];
};

const stickyNoteColors = [
  { bg: "#fef08a", border: "#fcd34d", text: "text-yellow-900" }, // yellow
  { bg: "#bfdbfe", border: "#93c5fd", text: "text-blue-900" },   // blue
  { bg: "#a9f9ce", border: "#26f787", text: "text-cyan-900" },   // cyan
  { bg: "#fbcfe8", border: "#f472b6", text: "text-pink-900" },   // pink
];

export default function TaskTable({ items }: TaskTableProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-500 bg-white shadow-sm">
      <table className="w-full border-collapse  text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="border border-black-200 px-3 py-2 text-left">No</th>
            <th className="border border-black-200 px-3 py-2 text-left">Task Name</th>
            <th className="border border-black-200 px-3 py-2 text-left">Details</th>
            <th className="border border-black-200 px-3 py-2 text-left">Hours</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td className="border border-gray-200 px-3 py-3 text-center text-gray-500" colSpan={4}>
                No tasks yet.
              </td>
            </tr>
          ) : (
            items.map((t, idx) => (
              <TaskRow
                key={t._id}
                task={t}
                index={idx}
                expandedTaskId={expandedTaskId}
                setExpandedTaskId={setExpandedTaskId}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

type TaskRowProps = {
  task: Task;
  index: number;
  expandedTaskId: string | null;
  setExpandedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
};

function TaskRow({ task, index, expandedTaskId, setExpandedTaskId }: TaskRowProps) {
  const isExpanded = expandedTaskId === task._id;

  // Always use _id for consistent cache keys, not task.no
  const lookupId = task._id;

  async function fetchTaskDetails(taskId: string) {
    return tasksApi.getTaskDetails(taskId);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["task-details", lookupId],
    queryFn: () => fetchTaskDetails(lookupId),
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  });

  const details = Array.isArray(data?.details) ? data?.details : [];
  const firstDetail = details[0]?.text ?? "";
  const countLabel = typeof task.detailsCount === "number" ? task.detailsCount : details.length;

  return (
    <React.Fragment key={task._id}>
      {/* Main Row */}
      <tr
        className="cursor-pointer transition-colors hover:bg-gray-50"
        onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
      >
        <td className="border border-gray-200 px-3 py-2 align-top text-gray-600">
          {index + 1}
        </td>
        <td className="border border-gray-200 px-3 py-2 align-top font-medium text-gray-900">
          {task.taskName}
        </td>
        <td className="border border-gray-200 px-3 py-2 align-top text-gray-700">
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
        <td className="border border-gray-200 px-3 py-2 align-top text-gray-700">
          {task.hours}
        </td>
      </tr>

      {/* Expandable Row with Sticky Notes */}
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={4} className="border border-t-2 border-gray-200 px-6 py-6 overflow-hidden">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {task.taskName} - Task Details ({task.hours}h total)
              </h3>

              {isLoading ? (
                <div className="text-sm text-gray-500 italic">Loading details…</div>
              ) : isError ? (
                <div className="text-sm text-red-600 italic">Failed to load details.</div>
              ) : details.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No details available</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {details.map((d, i) => {
                    const color = stickyNoteColors[i % stickyNoteColors.length];
                    const detailId = `${task._id}-detail-${i}`;

                    return (
                      <div
                        key={detailId}
                        className="relative animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out"
                        style={{
                          animationDelay: `${i * 75}ms`,
                        }}
                      >
                        {/* Canvas dot pattern background */}
                        <svg
                          className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                          style={{ opacity: 0.3 }}
                        >
                          <rect width="100%" height="100%" fill={`url(#dots-${detailId})`} />
                        </svg>

                        {/* Sticky Note Card */}
                        <div
                          className="rounded-lg p-4 shadow-md transition-transform hover:scale-105 relative overflow-hidden h-full"
                          style={{
                            backgroundColor: color.bg,
                            border: `2px solid ${color.border}`,
                            transform: `rotate(${-2 + (i % 4)}deg)`,
                            boxShadow:
                              "0 4px 15px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
                          }}
                        >
                          {/* Time Badge */}
                          <div className="flex items-start gap-2 mb-3 pr-8">
                            <div
                              className={`${color.text} text-xs font-bold bg-black/10 rounded px-2 py-1 min-w-max`}
                            >
                              {d.time}
                            </div>
                          </div>

                          {/* Detail Text */}
                          <p className={`${color.text} text-sm font-medium break-words leading-relaxed`}>
                            {d.text}
                          </p>

                          {/* Pen icon at bottom right */}
                          <div className="absolute bottom-2 right-3 text-xl opacity-20">✎</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

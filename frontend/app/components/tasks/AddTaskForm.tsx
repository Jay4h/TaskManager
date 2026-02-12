// components/tasks/AddTaskForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../../../src/api/tasks.api";
import { projectsApi } from "../../../src/api/projects.api";
import type { CreateTaskRequest, DetailBlock, TaskStatus } from "../../../src/types/task";

type AddTaskFormProps = {
  onAdded?: () => void | Promise<void>;
  queryClient?: ReturnType<typeof useQueryClient>;
};

const makeDetail = (): DetailBlock => ({ text: "", hours: 0, minutes: 0 });
export default function AddTaskForm({ onAdded, queryClient: qc }: AddTaskFormProps) {
  const defaultQueryClient = useQueryClient();
  const queryClient = qc || defaultQueryClient;
  const [open, setOpen] = useState(false);

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === "admin");
      } catch (e) {
        setIsAdmin(false);
      }
    }
  }, []);

  const [taskName, setTaskName] = useState("");
  const [hours, setHours] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("to-do");
  const [assignedTo, setAssignedTo] = useState("");
  const [projectId, setProjectId] = useState("");

  // User and project options
  const [users, setUsers] = useState<Array<{ _id: string; fullName: string }>>([]);
  const [projects, setProjects] = useState<Array<{ _id: string; projectName: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // details is now an array
  const [details, setDetails] = useState<DetailBlock[]>([makeDetail()]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Fetch users when modal opens (admin only)
  useEffect(() => {
    if (open && isAdmin && users.length === 0) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdmin]);

  // Fetch projects when modal opens or when user selection changes
  useEffect(() => {
    if (open) {
      if (isAdmin) {
        // Admin: fetch projects based on selected user, or their own projects if no user selected
        if (assignedTo) {
          fetchProjectsForUser(assignedTo);
        } else {
          // Fetch admin's own projects
          fetchMyProjects();
        }
      } else {
        // Regular user: always fetch their own projects
        fetchMyProjects();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assignedTo, isAdmin]);

  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const response = await projectsApi.getAllUsersForDropdown();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchProjectsForUser(userId: string) {
    setLoadingProjects(true);
    setProjectId(""); // Reset project selection
    try {
      const response = await projectsApi.getProjectsForUser(userId);
      if (response.success) {
        setProjects(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }

  async function fetchMyProjects() {
    setLoadingProjects(true);
    setProjectId(""); // Reset project selection
    try {
      const response = await projectsApi.getMyProjects();
      if (response.success) {
        setProjects(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }

  function openModal() {
    setError("");
    setTaskName("");
    setHours(0);
    setStartDate("");
    setDueDate("");
    setStatus("to-do");
    setAssignedTo("");
    setProjectId("");
    setProjects([]);
    setDetails([makeDetail()]);
    setOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setOpen(false);
    setError("");
  }

  // ESC closes modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading]);

  function addDetailRow() {
    setDetails((prev) => [...prev, makeDetail()]);
  }

  function removeDetailRow(index: number) {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDetail(index: number, patch: Partial<DetailBlock>) {
    setDetails((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  }

  const totalMinutes = useMemo(() => {
    return details.reduce((sum, d) => {
      if (!d.text.trim()) return sum;

      const h = Number(d.hours);
      const m = Number(d.minutes);

      if (Number.isNaN(h) || Number.isNaN(m)) return sum;

      const safeH = Math.max(0, Math.floor(h));
      const safeM = Math.min(59, Math.max(0, Math.floor(m)));

      return sum + safeH * 60 + safeM;
    }, 0);
  }, [details]);


  const totalHoursFromDetails = useMemo(() =>
    totalMinutes / 60, [totalMinutes]);


  // Basic validation for time
  const detailsValidationError = useMemo(() => {
    // Count valid details
    const validDetails = details.filter((d) => d.text.trim().length > 0);
    // Require at least 1 detail row with non-empty text
    if (validDetails.length === 0) return "Please add at least one detail.";
    if (hours == 0) return "Hours cannot be 0. Please enter the estimated hours for the task.";
    // Project is required only for admins
    if (isAdmin && !projectId) return "Please select a project.";
    if (!startDate) return "Please select a start date.";
    if (!dueDate) return "Please select a due date.";
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      return "Due date cannot be before start date.";
    }
    // If hours > 4, require at least 3 task details
    if (hours >= 4 && validDetails.length < 3) {
      return `For tasks >= 4 hours, you must add at least 3 task details (currently ${validDetails.length}).`;
    }
    if (hours === 3 && validDetails.length < 2) {
      return `For tasks = 3 hours, you must add at least 2 task details (currently ${validDetails.length}).`;
    }

    for (let i = 0; i < details.length; i++) {
      const d = details[i];
      if (!d.text.trim()) continue; // allow blank rows? we will filter before submit

      // if text is present, enforce time presence
      // if text is present, enforce a positive duration
      const h = Number(d.hours);
      const m = Number(d.minutes);
      if (m < 0 || m > 59) return `Detail ${i + 1}: minutes must be between 0 and 59.`;
      if (h < 0) return `Detail ${i + 1}: hours cannot be negative.`;
      if ((h ?? 0) === 0 && (m ?? 0) === 0) {
        return `Detail ${i + 1}: duration must be > 0 (hours or minutes).`;
      }
    }
    // Check if total detail time matches the hours value
    if (hours > 0 && Math.abs(totalHoursFromDetails - hours) > 0.01) {
      return `Total detail time (${totalHoursFromDetails.toFixed(2)}h) must exactly match the hours value (${hours}h).`;
    }

    return "";
  }, [details, hours, startDate, dueDate, totalHoursFromDetails, projectId, isAdmin]);

  function toHHMM(hours: number, minutes: number) {
    const h = Math.max(0, Math.floor(hours || 0));
    const m = Math.min(59, Math.max(0, Math.floor(minutes || 0)));
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (detailsValidationError) {
      setError(detailsValidationError);
      return;
    }

    setLoading(true);

    try {
      const cleanedDetails = details
        .map((d) => ({
          text: d.text.trim(),
          time: toHHMM(d.hours ?? 0, d.minutes ?? 0),
        }))
        .filter((d) => d.text.length > 0); // drop empty rows

      const payload: CreateTaskRequest = {
        taskName: taskName.trim(),
        hours: hours,
        details: cleanedDetails,
        startDate,
        dueDate,
        status,
      };

      // Only include projectId if it's selected
      if (projectId) {
        payload.projectId = projectId;
      }

      // Only include assignedTo if admin has selected a user
      if (isAdmin && assignedTo) {
        payload.assignedTo = assignedTo;
      }

      const data = await tasksApi.createTask(payload);

      // Cache the new task's details immediately using the _id
      if (data.insertedId && data.task?.details) {
        queryClient.setQueryData(
          ["task-details", data.insertedId],
          { ok: true, details: data.task.details }
        );
      }

      // Reset + close modal
      setTaskName("");
      setHours(0);
      setStartDate("");
      setDueDate("");
      setStatus("to-do");
      setAssignedTo("");
      setProjectId("");
      setProjects([]);
      setDetails([makeDetail()]);
      setOpen(false);

      await onAdded?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add task";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={openModal}
        aria-label="Add task"
        title="Add task"
        style={fab}
      >
        <PlusIcon />
      </button>

      {/* Modal */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-task-title"
          style={backdrop}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div style={modal}>
            <div style={modalHeader}>
              <h3 id="add-task-title" style={{ margin: 0 }}>
                Add Task
              </h3>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                style={iconButton}
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              <label style={label}>
                Task name
                <input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g. API Integration"
                  required
                  style={input}
                  autoFocus
                />
              </label>

              {isAdmin && (
                <>
                  <label style={label}>
                    Assign to user (optional for personal task)
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      style={input}
                      disabled={loadingUsers}
                    >
                      <option value="">
                        {loadingUsers ? "Loading users..." : "Select a user (or leave for personal task)"}
                      </option>
                      {users.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <label style={label}>
                Project {!isAdmin && <span style={{ fontSize: 12, color: "#6b7280" }}>(optional)</span>}
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required={isAdmin}
                  style={input}
                  disabled={loadingProjects}
                >
                  <option value="">
                    {loadingProjects
                      ? "Loading projects..."
                      : projects.length === 0
                      ? "No projects available"
                      : isAdmin ? "Select a project" : "Select a project (optional)"}
                  </option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.projectName}
                    </option>
                  ))}
                </select>
              </label>

              <label style={label}>
                Hours
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  min={0}
                  step="0.5"
                  required
                  style={input}
                />
              </label>

              <div style={dateRow}>
                <label style={label}>
                  Start date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={input}
                  />
                </label>

                <label style={label}>
                  Due date
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    style={input}
                  />
                </label>
              </div>

              <label style={label}>
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  style={input}
                >
                  <option value="to-do">to do</option>
                  <option value="in-progress">in progress</option>
                  <option value="completed">completed</option>
                </select>
              </label>

              {/* Show total time from details */}
              {totalHoursFromDetails > 0 && (
                <div style={{ fontSize: 13, color: totalHoursFromDetails > hours ? "#dc2626" : "#6b7280" }}>
                  Total detail time: {totalHoursFromDetails.toFixed(2)} hours
                </div>
              )}

              {/* Details section */}
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Details (with time)</div>
                </div>

                {details.map((d, idx) => (
                  <div key={idx} style={detailRow}>
                    {/* Details input + (+) button beside it (as requested) */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={d.text}
                        onChange={(e) => updateDetail(idx, { text: e.target.value })}
                        placeholder={`Detail ${idx + 1}`}
                        style={{ ...input, flex: 1 }}
                      />

                      {/* Plus button beside details field */}
                      {idx === details.length - 1 ? (
                        <button
                          type="button"
                          onClick={addDetailRow}
                          aria-label="Add another detail"
                          title="Add another detail"
                          style={smallIconBtn}
                        >
                          <PlusIconSmall />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeDetailRow(idx)}
                          aria-label="Remove this detail"
                          title="Remove"
                          style={smallIconBtnDanger}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>

                    {/* Time range */}
                    <div style={timeRow}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontSize: 14 }}>Duration</div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <label style={{ ...label, margin: 0 }}>
                            Hours
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={d.hours}
                              onChange={(e) => {
                                const next = Number(e.target.value);
                                updateDetail(idx, { hours: Number.isFinite(next) ? next : 0 });
                              }}
                              style={input}
                            />
                          </label>

                          <label style={{ ...label, margin: 0 }}>
                            Minutes
                            <input
                              type="number"
                              min={0}
                              max={59}
                              step={1}
                              value={d.minutes}
                              onChange={(e) => {
                                let next = Number(e.target.value);
                                if (!Number.isFinite(next)) next = 0;
                                // clamp to 0..59
                                next = Math.max(0, Math.min(59, Math.floor(next)));
                                updateDetail(idx, { minutes: next });
                              }}
                              style={input}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              {error ? <p style={errorText}>{error}</p> : null}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  style={secondaryBtn}
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={primaryBtn}>
                  {loading ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------- Styles ---------- */

const fab: React.CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 20,
  width: 56,
  height: 56,
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  display: "grid",
  placeItems: "center",
  background: "#111",
  color: "#fff",
};

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 50,
};

const modal: React.CSSProperties = {
  width: "min(560px, 100%)",
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  maxHeight: "90vh",
  overflowY: "auto",
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const iconButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 6,
  borderRadius: 8,
};

const label: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 14,
  color: "black",
};

const input: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  color: "black",
};

const dateRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const detailRow: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 10,
};

const timeRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
};

const smallIconBtn: React.CSSProperties = {
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  width: 40,
  height: 40,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
};

const smallIconBtnDanger: React.CSSProperties = {
  ...smallIconBtn,
  border: "1px solid #f1c6c6",
};

const primaryBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  background: "#111",
  color: "#fff",
};

const secondaryBtn: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  background: "#fff",
};

const errorText: React.CSSProperties = {
  color: "crimson",
  margin: 0,
  fontSize: 13,
};

/* ---------- Icons ---------- */ 

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIconSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 6v12M6 12h12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6m-7 4h8m-9 0 1 14h8l1-14M10 11v6m4-6v6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

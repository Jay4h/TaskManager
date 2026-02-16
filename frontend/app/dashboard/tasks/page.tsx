"use client";

import { Suspense } from "react";
import TasksClient from "../../components/tasks/TasksClient";

function TasksContent() {
  return <TasksClient />;
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TasksContent />
    </Suspense>
  );
}

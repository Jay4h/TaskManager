
import TasksClient from "./components/tasks/TasksClient";
import LoginForm from "./components/auth/LoginForm";
export default function Home() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Task Manager</h1>
          <LoginForm />
        </header>
        <TasksClient />
      </div>
    </>
  );
}

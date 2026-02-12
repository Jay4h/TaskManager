"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "./components/auth/LoginForm";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Manager</h1>
          <p className="text-gray-600">Sign in to manage your tasks and projects</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

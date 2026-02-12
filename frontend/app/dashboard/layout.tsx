"use client";

import ReactQueryProvider from "../providers/ReactQueryProvider";
import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<"admin" | "user" | undefined>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserRole(userData.role);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar userRole={userRole} />
      <main className="flex-1 p-8">
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </main>
    </div>
  );
}

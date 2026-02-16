"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import UsersClient from "../../components/users/UsersClient";

export default function UsersPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Only run once
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/");
      return;
    }

    try {
      const userData = JSON.parse(user);
      if (userData.role === "admin") {
        setIsAdmin(true);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/dashboard");
    }
  }, [router]);

  // Show nothing while checking auth
  if (isAdmin === null) {
    return null;
  }

  // Only render if admin
  if (!isAdmin) {
    return null;
  }

  return <UsersClient />;
}

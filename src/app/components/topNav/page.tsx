"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Bell } from "lucide-react";
import { auth } from "@/services/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function Topbar() {
  const [time, setTime] = useState(new Date());
  const router = useRouter();
  const { userProfile } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const amPm = time.getHours() >= 12 ? "PM" : "AM";

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm">
      <h1 className="text-xl font-semibold text-gray-800">
        Welcome, {userProfile?.firstName || "User"}
      </h1>
      <div className="flex items-center space-x-6">
        <Link
          href="/dashboard/notifications"
          className="text-gray-600 hover:text-blue-600"
        >
          <Bell className="w-6 h-6" />
        </Link>
        <span className="text-sm font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded shadow-sm">
          {formattedTime}{" "}
          <span className="text-xs text-blue-600 font-semibold">{amPm}</span>
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded hover:bg-red-600"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Logout
        </button>
      </div>
    </div>
  );
}

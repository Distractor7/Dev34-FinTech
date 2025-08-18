// src/app/(dashboard)/layout.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import gsap from "gsap";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "../components/sideNav/page";
import Topbar from "../components/topNav/page";
import TransitionWrapper from "../components/transition/page";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, loading, error } = useAuth();

  useEffect(() => {
    // Handle authentication state
    if (!loading) {
      if (!user || !userProfile) {
        console.log("No authenticated user, redirecting to login");
        router.push("/");
        return;
      }

      // If user is a service provider and trying to access main dashboard, redirect them
      if (
        userProfile.role === "service_provider" &&
        pathname !== "/dashboard/coming-soon"
      ) {
        router.push("/dashboard/coming-soon");
        return;
      }

      // If user is admin and trying to access coming-soon page, redirect them to main dashboard
      if (
        userProfile.role === "admin" &&
        pathname === "/dashboard/coming-soon"
      ) {
        router.push("/dashboard/home");
        return;
      }
    }
  }, [user, userProfile, loading, pathname, router]);

  useEffect(() => {
    if (!loading && user && userProfile && layoutRef.current) {
      gsap.fromTo(
        layoutRef.current,
        {
          opacity: 0,
          y: 40,
          scale: 0.97,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
        }
      );
    }
  }, [loading, user, userProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Authentication Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null; // Will redirect in useEffect
  }

  // Don't show sidebar/navbar for service providers on coming-soon page
  if (
    userProfile.role === "service_provider" &&
    pathname === "/dashboard/coming-soon"
  ) {
    return <>{children}</>;
  }

  return (
    <div ref={layoutRef} className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="overflow-y-auto">
          <TransitionWrapper>{children}</TransitionWrapper>
        </main>
      </div>
    </div>
  );
}

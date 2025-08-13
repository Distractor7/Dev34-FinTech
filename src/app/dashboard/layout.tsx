// src/app/(dashboard)/layout.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import gsap from "gsap";
import { auth } from "@/services/firebaseConfig";
import UserService from "@/services/userService";
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
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserAccess = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.push("/");
          return;
        }

        const profile = await UserService.getUserProfile(user.uid);
        if (!profile) {
          router.push("/");
          return;
        }

        setUserRole(profile.role);

        // If user is a service provider and trying to access main dashboard, redirect them
        if (
          profile.role === "service_provider" &&
          pathname !== "/dashboard/coming-soon"
        ) {
          router.push("/dashboard/coming-soon");
          return;
        }

        // If user is admin and trying to access coming-soon page, redirect them to main dashboard
        if (profile.role === "admin" && pathname === "/dashboard/coming-soon") {
          router.push("/dashboard/home");
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Error checking user access:", error);
        router.push("/");
      }
    };

    checkUserAccess();
  }, [router, pathname]);

  useEffect(() => {
    if (!loading && layoutRef.current) {
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
  }, [loading]);

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

  // Don't show sidebar/navbar for service providers on coming-soon page
  if (
    userRole === "service_provider" &&
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

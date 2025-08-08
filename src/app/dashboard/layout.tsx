// src/app/(dashboard)/layout.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Sidebar from "../components/sideNav/page";
import Topbar from "../components/topNav/page";
import TransitionWrapper from "../components/transition/page";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, []);

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

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function TransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "#page-content",
        {
          opacity: 0,
          y: 50, // ✨ Slide further from below
          scale: 1, // ✨ Start smaller
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.5, // ✨ Slower transition
          ease: "power4.out", // ✨ Smooth and dramatic
        }
      );
    });

    return () => ctx.revert();
  }, [pathname]);

  return (
    <div ref={containerRef} id="page-content" className="min-h-screen">
      {children}
    </div>
  );
}

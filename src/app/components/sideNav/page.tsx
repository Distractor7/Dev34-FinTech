"use client";

import { useState } from "react";
import {
  Home,
  Bell,
  Calendar,
  FileText,
  BarChart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const navItems = [
  { name: "Home", href: "/dashboard/home", icon: <Home size={20} /> },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
    icon: <Bell size={20} />,
  },
  {
    name: "Schedules",
    href: "/dashboard/schedules",
    icon: <Calendar size={20} />,
  },
  { name: "Reports", href: "/dashboard/reports", icon: <FileText size={20} /> },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart size={20} />,
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={clsx(
        "bg-white shadow-md border-r transition-all duration-300",
        collapsed ? "w-16" : "w-44"
      )}
    >
      <div className="flex items-center justify-between p-4">
        {!collapsed && <span className="text-lg font-bold">Obsero</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-black"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex flex-col">
        {navItems.map(({ name, href, icon }) => (
          <Link
            key={name}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors",
              collapsed && "justify-center"
            )}
          >
            {icon}
            {!collapsed && <span>{name}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

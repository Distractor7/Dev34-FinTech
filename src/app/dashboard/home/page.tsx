"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../../../services/firebaseConfig"; // your Firestore config
import { collection, query, where, getDocs } from "firebase/firestore";

type Alert = {
  id: string;
  title: string;
  message: string;
  severity: string;
  acknowledged: boolean;
  timestamp: any;
};

export default function HomePage() {
  const [time, setTime] = useState(new Date());
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  useEffect(() => {
    const fetchCriticalAlerts = async () => {
      const q = query(
        collection(db, "alerts"),
        where("severity", "==", "critical"),
        where("acknowledged", "==", false)
      );

      const snapshot = await getDocs(q);
      const results: Alert[] = [];

      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...(doc.data() as Omit<Alert, "id">) });
      });

      setAlerts(results);
    };

    fetchCriticalAlerts();
  }, []);

  return (
    <main className="min-h-screen p-8 bg-white">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Emergency Alerts */}
        <div className="bg-red-50 rounded-xl shadow p-6 hover:shadow-md transition col-span-1 md:col-span-2">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            🚨 Emergency Alerts
          </h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-red-500">
              No critical events right now.
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="bg-white border border-red-200 rounded p-3 shadow-sm"
                >
                  <p className="font-semibold text-red-700">{alert.title}</p>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(alert.timestamp?.seconds * 1000).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Analytics quick nav */}
        <div className="bg-white rounded-xl shadow p-6 hover:shadow-md transition flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              View Analytics
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Performance, incidents, shift data
            </p>
          </div>
          <Link
            href="/dashboard/analytics"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Open
          </Link>
        </div>

        {/* Placeholder */}
        <div className="col-span-1 md:col-span-2 xl:col-span-3 h-64 bg-white rounded-xl border-dashed border-2 border-gray-300 flex items-center justify-center text-gray-400 text-sm">
          [ Live System Summary / Widgets coming soon ]
        </div>
      </div>
    </main>
  );
}

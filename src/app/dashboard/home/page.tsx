"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  Plus,
  Eye,
  DollarSign,
  Calendar,
} from "lucide-react";

interface DashboardStats {
  totalProviders: number;
  activeProviders: number;
  totalProperties: number;
  activeProperties: number;
  monthlyRevenue: number;
  pendingInvoices: number;
  upcomingServices: number;
  alerts: number;
}

const mockStats: DashboardStats = {
  totalProviders: 12,
  activeProviders: 10,
  totalProperties: 25,
  activeProperties: 23,
  monthlyRevenue: 45000,
  pendingInvoices: 8,
  upcomingServices: 15,
  alerts: 3,
};

const recentActivities = [
  {
    id: "1",
    type: "service",
    title: "Tech Solutions Inc. completed maintenance",
    time: "2 hours ago",
    status: "completed",
  },
  {
    id: "2",
    type: "invoice",
    title: "Invoice #INV-2024-005 sent to Digital Marketing Pro",
    time: "4 hours ago",
    status: "sent",
  },
  {
    id: "3",
    type: "alert",
    title: "Property #123 requires attention",
    time: "6 hours ago",
    status: "pending",
  },
  {
    id: "4",
    type: "provider",
    title: "New service provider registered: Financial Advisors LLC",
    time: "1 day ago",
    status: "new",
  },
];

export default function HomePage() {
  const [stats] = useState<DashboardStats>(mockStats);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "service":
        return <Users size={16} className="text-blue-600" />;
      case "invoice":
        return <DollarSign size={16} className="text-green-600" />;
      case "alert":
        return <AlertTriangle size={16} className="text-red-600" />;
      case "provider":
        return <Users size={16} className="text-purple-600" />;
      default:
        return <Eye size={16} className="text-gray-600" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "new":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Track your service providers and properties
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Service Providers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeProviders}/{stats.totalProviders}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="text-green-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Properties</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeProperties}/{stats.totalProperties}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="text-yellow-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Monthly Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.alerts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/dashboard/service-providers"
          className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Providers
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Add, edit, and track service providers
              </p>
            </div>
            <Plus className="text-blue-600" size={24} />
          </div>
        </Link>

        <Link
          href="/dashboard/invoices"
          className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
              <p className="text-sm text-gray-600 mt-1">
                {stats.pendingInvoices} pending invoices
              </p>
            </div>
            <DollarSign className="text-green-600" size={24} />
          </div>
        </Link>

        <Link
          href="/dashboard/financial-reports"
          className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Financial Reports
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                View weekly and monthly reports
              </p>
            </div>
            <TrendingUp className="text-purple-600" size={24} />
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getActivityIcon(activity.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActivityColor(
                    activity.status
                  )}`}
                >
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Services */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Upcoming Services
            </h2>
            <span className="text-sm text-gray-500">
              {stats.upcomingServices} scheduled
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No upcoming services
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Services will appear here when scheduled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

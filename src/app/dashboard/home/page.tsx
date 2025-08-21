"use client";

import { useState, useEffect } from "react";
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
  RefreshCw,
} from "lucide-react";
import {
  DashboardService,
  DashboardStats,
  RecentActivity,
  ProviderSummary,
  PropertySummary,
} from "@/services/dashboardService";

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProviders: 0,
    activeProviders: 0,
    totalProperties: 0,
    activeProperties: 0,
    monthlyRevenue: 0,
    pendingInvoices: 0,
    upcomingServices: 0,
    alerts: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    []
  );
  const [topProviders, setTopProviders] = useState<ProviderSummary[]>([]);
  const [topProperties, setTopProperties] = useState<PropertySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [statsData, activitiesData, providersData, propertiesData] =
        await Promise.all([
          DashboardService.getDashboardStats(),
          DashboardService.getRecentActivities(),
          DashboardService.getTopProviders(),
          DashboardService.getTopProperties(),
        ]);

      setStats(statsData);
      setRecentActivities(activitiesData);
      setTopProviders(providersData);
      setTopProperties(propertiesData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! Here's what's happening with your properties and
            service providers.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw
            size={16}
            className={`mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Service Providers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Service Providers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalProviders}
              </p>
              <p className="text-sm text-green-600">
                {stats.activeProviders} active
              </p>
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Properties</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalProperties}
              </p>
              <p className="text-sm text-green-600">
                {stats.activeProperties} active
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Monthly Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
              <p className="text-sm text-green-600">This month</p>
            </div>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Pending Invoices
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.pendingInvoices}
              </p>
              <p className="text-sm text-yellow-600">Requires attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activities
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {activity.time}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(
                          activity.status
                        )}`}
                      >
                        {activity.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/dashboard/service-providers"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  Manage Providers
                </span>
              </Link>
              <Link
                href="/dashboard/properties"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <Building2 className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  View Properties
                </span>
              </Link>
              <Link
                href="/dashboard/invoices"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
              >
                <DollarSign className="h-8 w-8 text-yellow-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  Manage Invoices
                </span>
              </Link>
              <Link
                href="/dashboard/analytics"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  View Analytics
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Top Service Providers */}
      {topProviders.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Service Providers
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {provider.businessName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {provider.service}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Rating:</span>
                      <span className="font-medium text-gray-900">
                        {provider.rating}/5
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {provider.lastActive}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Properties */}
      {topProperties.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Properties
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topProperties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {property.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {property.address?.fullAddress ||
                          `${property.address?.street}, ${property.address?.city}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        property.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {property.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {property.lastUpdated}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

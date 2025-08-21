"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building,
  Calendar,
  ArrowRight,
  X,
  LineChart,
  PieChart,
  Activity,
  Search,
  Filter,
  Users,
  Building2,
  AlertCircle,
} from "lucide-react";
import { Property, PeriodGranularity, PropertyRankItem } from "@/types/float34";
import { getApi } from "@/lib/api";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from "recharts";
import { Float34Api } from "@/lib/api";
import { Invoice } from "@/types/float34";
import { ServiceProviderService } from "@/services/serviceProviderService";
import { useAuth } from "@/contexts/AuthContext";

// Helper functions
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getGrowthColor(value: number): string {
  if (value > 0) return "text-green-600";
  if (value < 0) return "text-red-600";
  return "text-gray-500";
}

function getGrowthIcon(value: number) {
  if (value > 0) return <TrendingUp size={16} className="text-green-600" />;
  if (value < 0) return <TrendingDown size={16} className="text-red-600" />;
  return null;
}

function getMonthName(month: string): string {
  const monthNames = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  };
  return monthNames[month as keyof typeof monthNames] || month;
}

function formatPeriodLabel(
  period: string,
  granularity: PeriodGranularity
): string {
  switch (granularity) {
    case "WEEK":
      const weekMatch = period.match(/^(\d{4})-W(\d{2})$/);
      if (weekMatch) {
        const year = weekMatch[1];
        const week = weekMatch[2];
        return `Week ${week}, ${year}`;
      }
      return period;
    case "MONTH":
      const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
      if (monthMatch) {
        const date = new Date(
          parseInt(monthMatch[1]),
          parseInt(monthMatch[2]) - 1
        );
        return date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }
      return period;
    case "YEAR":
      return period;
    default:
      return period;
  }
}

// KPI Card Component
function KPICard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center mt-2">
              {getGrowthIcon(trend.value)}
              <span className={`text-sm ml-1 ${getGrowthColor(trend.value)}`}>
                {formatPercentage(trend.value)} {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={`${iconBg} p-3 rounded-full`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

// Property Select Component
function PropertySelect({
  properties,
  value,
  onChange,
}: {
  properties: Property[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedProperty = properties.find((p) => p.id === value);

  const filteredProperties = properties.filter(
    (property) =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address?.fullAddress
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      property.address?.street
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      property.address?.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClear = () => {
    onChange("");
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder="Search properties..."
          value={searchTerm || (selectedProperty ? selectedProperty.name : "")}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {value ? (
          <button
            onClick={handleClear}
            className="absolute right-8 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        ) : (
          <Building
            className="absolute right-3 top-2.5 text-gray-400"
            size={16}
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2 px-2">
              Select a property:
            </div>
            {filteredProperties.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-1">
                No properties found
              </div>
            ) : (
              filteredProperties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => {
                    onChange(property.id);
                    setSearchTerm("");
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-2 text-sm rounded hover:bg-gray-100 ${
                    value === property.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-900"
                  }`}
                >
                  <div className="font-medium">{property.name}</div>
                  {property.address && (
                    <div className="text-xs text-gray-500 truncate">
                      {property.address.fullAddress ||
                        `${property.address.street}, ${property.address.city}`}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}

// Service Provider Select Component
function ServiceProviderSelect({
  providers,
  value,
  onChange,
}: {
  providers: any[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedProvider = providers.find((p) => p.id === value);

  // Debug logging
  useEffect(() => {
    console.log("🔍 ServiceProviderSelect - providers:", providers);
    console.log("🔍 ServiceProviderSelect - value:", value);
    console.log(
      "🔍 ServiceProviderSelect - selectedProvider:",
      selectedProvider
    );
  }, [providers, value, selectedProvider]);

  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log(
    "🔍 ServiceProviderSelect - filteredProviders:",
    filteredProviders
  );

  const handleClear = () => {
    onChange("");
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder="Search service providers..."
          value={searchTerm || (selectedProvider ? selectedProvider.name : "")}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {value ? (
          <button
            onClick={handleClear}
            className="absolute right-8 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        ) : (
          <Activity
            className="absolute right-3 top-2.5 text-gray-400"
            size={16}
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2 px-2">
              Select a service provider:
            </div>
            {filteredProviders.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-1">
                No providers found
              </div>
            ) : (
              filteredProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    onChange(provider.id);
                    setSearchTerm("");
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-2 text-sm rounded hover:bg-gray-100 ${
                    value === provider.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-900"
                  }`}
                >
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-xs text-gray-500">
                    {provider.service}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}

// Period Selector Component
function PeriodSelector({
  granularity,
  value,
  onChange,
}: {
  granularity: PeriodGranularity;
  value: string;
  onChange: (value: string) => void;
}) {
  const getPeriodOptions = (g: PeriodGranularity) => {
    switch (g) {
      case "WEEK":
        return [
          { value: "2024-W04", label: "Week 4, Jan 2024" },
          { value: "2024-W03", label: "Week 3, Jan 2024" },
          { value: "2024-W02", label: "Week 2, Jan 2024" },
          { value: "2024-W01", label: "Week 1, Jan 2024" },
          { value: "2023-W52", label: "Week 52, Dec 2023" },
          { value: "2023-W51", label: "Week 51, Dec 2023" },
          { value: "2023-W50", label: "Week 50, Dec 2023" },
          { value: "2023-W49", label: "Week 49, Dec 2023" },
          { value: "2023-W48", label: "Week 48, Nov 2023" },
          { value: "2023-W47", label: "Week 47, Nov 2023" },
          { value: "2023-W46", label: "Week 46, Nov 2023" },
          { value: "2023-W45", label: "Week 45, Nov 2023" },
        ];
      case "MONTH":
        return [
          { value: "2024-01", label: "January 2024" },
          { value: "2023-12", label: "December 2023" },
          { value: "2023-11", label: "November 2023" },
          { value: "2023-10", label: "October 2023" },
          { value: "2023-09", label: "September 2023" },
        ];
      case "YEAR":
        return [
          { value: "2024", label: "2024" },
          { value: "2023", label: "2023" },
          { value: "2022", label: "2022" },
        ];
      default:
        return [];
    }
  };

  const options = getPeriodOptions(granularity);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Granularity Tabs Component
function GranularityTabs({
  value,
  onChange,
}: {
  value: PeriodGranularity;
  onChange: (value: PeriodGranularity) => void;
}) {
  const tabs = [
    { value: "WEEK", label: "Weekly" },
    { value: "MONTH", label: "Monthly" },
    { value: "YEAR", label: "Yearly" },
  ] as const;

  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            value === tab.value
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Revenue Trend Line Chart Component
function RevenueTrendChart({
  series,
  height = "h-80",
}: {
  series: any[];
  height?: string;
}) {
  if (!series || series.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <LineChart className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Revenue Trend
            </h3>
            <p className="text-sm text-gray-600">No trend data available</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data based on granularity
  let chartData: any[] = [];

  // Check if we have aggregated data for all properties
  const aggregatedSeries = series.find(
    (item) =>
      item.propertyId === "all" ||
      item.propertyName === "All Properties" ||
      item.providerId === "all" ||
      item.providerName === "All Service Providers"
  );

  if (
    aggregatedSeries &&
    aggregatedSeries.trend &&
    aggregatedSeries.trend.length > 0
  ) {
    // Use aggregated data for all properties view
    chartData = aggregatedSeries.trend
      .map((item: any) => ({
        period: formatPeriodLabel(item.label, "MONTH"),
        revenue: item.revenue,
        shortLabel: item.label,
      }))
      .sort((a: any, b: any) => a.shortLabel.localeCompare(b.shortLabel));

    // Apply appropriate slicing based on granularity
    if (chartData.length > 8) {
      chartData = chartData.slice(-8); // Show last 8 periods
    }
  } else {
    // Fallback to individual property/provider aggregation - Monthly only
    // For monthly view, aggregate data across all items for each month
    const monthlyData: { [key: string]: number } = {};

    series.forEach((item) => {
      if (item.trend && Array.isArray(item.trend)) {
        item.trend.forEach((trendItem: any) => {
          if (!monthlyData[trendItem.label]) {
            monthlyData[trendItem.label] = 0;
          }
          monthlyData[trendItem.label] += trendItem.revenue || 0;
        });
      }
    });

    // Convert to chart format and sort by month
    chartData = Object.entries(monthlyData)
      .map(([label, revenue]) => ({
        period: formatPeriodLabel(label, "MONTH"),
        revenue,
        shortLabel: label,
      }))
      .sort((a, b) => a.shortLabel.localeCompare(b.shortLabel))
      .slice(-8); // Show last 8 months
  }

  // If we still don't have chart data, try to create it from the series items themselves
  if (chartData.length === 0 && series.length > 0) {
    // Create a simple chart from the series data
    chartData = series
      .filter((item) => item.revenue > 0)
      .map((item, index) => ({
        period: item.propertyName || item.providerName || `Item ${index + 1}`,
        revenue: item.revenue,
        shortLabel:
          item.propertyName || item.providerName || `Item ${index + 1}`,
      }))
      .slice(0, 8); // Show up to 8 items
  }

  if (chartData.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <LineChart className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Revenue Overview
            </h3>
            <p className="text-sm text-gray-600">No revenue data available</p>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...chartData.map((item: any) => item.revenue));
  const minRevenue = Math.min(...chartData.map((item: any) => item.revenue));

  // Custom tooltip formatter
  const formatTooltipValue = (value: any) => {
    return formatCurrency(value);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
      <div className="flex items-center gap-3 mb-4">
        <LineChart className="text-blue-600" size={24} />
        <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
        <span className="text-sm text-gray-500 capitalize">(monthly)</span>
      </div>

      {/* Line Chart */}
      <div className="w-full h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 35 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="period"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={15}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                formatCurrency(value, "USD").replace("$", "")
              }
            />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Period: ${label}`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3B82F6"
              strokeWidth={3}
              fill="url(#revenueGradient)"
              dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#3B82F6", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats below the chart */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-sm text-gray-600">Highest</div>
          <div className="text-lg font-semibold text-green-600">
            {formatCurrency(maxRevenue)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Lowest</div>
          <div className="text-lg font-semibold text-red-600">
            {formatCurrency(minRevenue)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Average</div>
          <div className="text-lg font-semibold text-blue-600">
            {formatCurrency(
              chartData.reduce(
                (sum: number, item: any) => sum + item.revenue,
                0
              ) / chartData.length
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Property Performance Comparison Component
function PropertyPerformanceTable({
  byProperty,
  height = "h-80",
}: {
  byProperty: PropertyRankItem[];
  height?: string;
}) {
  if (!byProperty || byProperty.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Property Performance
            </h3>
            <p className="text-sm text-gray-600">No property data available</p>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...byProperty.map((p) => p.revenue));

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="text-green-600" size={24} />
        <h3 className="text-lg font-medium text-gray-900">
          Property Performance
        </h3>
      </div>
      <div className="space-y-4">
        {byProperty.slice(0, 6).map((property, index) => (
          <div key={property.propertyId} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-900">
                {property.propertyName}
              </span>
              <span className="text-gray-600">
                {formatCurrency(property.revenue)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(property.revenue / maxRevenue) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Profit:{" "}
                {property.profit ? formatCurrency(property.profit) : "N/A"}
              </span>
              <span>
                Margin:{" "}
                {property.marginPct
                  ? `${property.marginPct.toFixed(1)}%`
                  : "N/A"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Service Provider Performance Table Component
function ServiceProviderPerformanceTable({
  byProvider,
  height = "h-80",
}: {
  byProvider: any[];
  height?: string;
}) {
  if (!byProvider || byProvider.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Service Provider Performance
            </h3>
            <p className="text-sm text-gray-600">No provider data available</p>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...byProvider.map((p) => p.revenue));

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="text-purple-600" size={24} />
        <h3 className="text-lg font-medium text-gray-900">
          Service Provider Performance
        </h3>
      </div>
      <div className="space-y-4">
        {byProvider.slice(0, 6).map((provider, index) => (
          <div key={provider.providerId} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-900">
                {provider.providerName}
              </span>
              <span className="text-gray-600">
                {formatCurrency(provider.revenue)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(provider.revenue / maxRevenue) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Profit:{" "}
                {provider.profit ? formatCurrency(provider.profit) : "N/A"}
              </span>
              <span>
                Margin:{" "}
                {provider.marginPct
                  ? `${provider.marginPct.toFixed(1)}%`
                  : "N/A"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Profit Margin Analysis Component
function ProfitMarginTable({
  series,
  height = "h-64",
}: {
  series: any[];
  height?: string;
}) {
  if (!series || series.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <PieChart className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Profit Margin Analysis
            </h3>
            <p className="text-sm text-gray-600">No margin data available</p>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = series.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = series.reduce((sum, item) => sum + (item.profit || 0), 0);
  const totalExpenses = totalRevenue - totalProfit;
  const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
      <div className="flex items-center gap-3 mb-4">
        <PieChart className="text-blue-600" size={24} />
        <h3 className="text-lg font-medium text-gray-900">
          Profit Margin Analysis
        </h3>
      </div>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {marginPct.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Overall Margin</div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Revenue</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Expenses</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Profit</span>
            <span className="text-sm font-medium text-green-600">
              {formatCurrency(totalProfit)}
            </span>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-200">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${marginPct}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Growth Metrics Component
function GrowthMetricsTable({
  series,
  height = "h-64",
}: {
  series: any[];
  height?: string;
}) {
  if (!series || series.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <TrendingUp className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Growth Metrics
            </h3>
            <p className="text-sm text-gray-600">No growth data available</p>
          </div>
        </div>
      </div>
    );
  }

  const revenueGrowth = series[0]?.revenueDeltaPct || 0;
  const profitGrowth = series[0]?.profitDeltaPct || 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="text-green-600" size={24} />
        <h3 className="text-lg font-medium text-gray-900">Growth Metrics</h3>
      </div>
      <div className="space-y-4">
        <div className="text-center">
          <div
            className={`text-2xl font-bold mb-1 ${getGrowthColor(
              revenueGrowth
            )}`}
          >
            {formatPercentage(revenueGrowth)}
          </div>
          <div className="text-sm text-gray-600">Revenue Growth</div>
        </div>
        <div className="text-center">
          <div
            className={`text-2xl font-bold mb-1 ${getGrowthColor(
              profitGrowth
            )}`}
          >
            {formatPercentage(profitGrowth)}
          </div>
          <div className="text-sm text-gray-600">Profit Growth</div>
        </div>
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2">
            {getGrowthIcon(revenueGrowth)}
            <span className="text-sm text-gray-600">
              {revenueGrowth > 0
                ? "Growing"
                : revenueGrowth < 0
                ? "Declining"
                : "Stable"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Invoice Performance Component
function InvoicePerformanceTable({
  series,
  height = "h-64",
}: {
  series: any[];
  height?: string;
}) {
  if (!series || series.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Activity className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Invoice Performance
            </h3>
            <p className="text-sm text-gray-600">No invoice data available</p>
          </div>
        </div>
      </div>
    );
  }

  const totalInvoices = series.reduce(
    (sum, item) => sum + item.invoices.total,
    0
  );
  const totalPaid = series.reduce((sum, item) => sum + item.invoices.paid, 0);
  const paymentRate = totalInvoices > 0 ? (totalPaid / totalInvoices) * 100 : 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
      <div className="flex items-center gap-3 mb-4">
        <Activity className="text-purple-600" size={24} />
        <h3 className="text-lg font-medium text-gray-900">
          Invoice Performance
        </h3>
      </div>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {paymentRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Payment Rate</div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Invoices</span>
            <span className="text-sm font-medium text-gray-900">
              {totalInvoices}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Paid</span>
            <span className="text-sm font-medium text-green-600">
              {totalPaid}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Outstanding</span>
            <span className="text-sm font-medium text-red-600">
              {totalInvoices - totalPaid}
            </span>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-200">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${paymentRate}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Combined Property-Provider Performance Component
function CombinedPerformanceTable({
  combinedData,
  height = "h-80",
}: {
  combinedData: any[];
  height?: string;
}) {
  if (!combinedData || combinedData.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Combined Performance
            </h3>
            <p className="text-sm text-gray-600">No combined data available</p>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...combinedData.map((item) => item.revenue));

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="text-indigo-600" size={24} />
        <h3 className="text-lg font-medium text-gray-900">
          Property-Service Provider Performance
        </h3>
      </div>
      <div className="space-y-4">
        {combinedData.slice(0, 8).map((item, index) => (
          <div
            key={`${item.propertyName}-${item.providerName}`}
            className="space-y-2"
          >
            <div className="flex justify-between text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {item.propertyName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {item.providerName}
                </div>
              </div>
              <span className="text-gray-600 ml-2">
                {formatCurrency(item.revenue)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-indigo-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Profit: {item.profit ? formatCurrency(item.profit) : "N/A"}
              </span>
              <span>
                Margin:{" "}
                {item.marginPct ? `${item.marginPct.toFixed(1)}%` : "N/A"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick Filter Suggestions Component
function QuickFilterSuggestions({
  properties,
  providers,
  onPropertySelect,
  onProviderSelect,
}: {
  properties: Property[];
  providers: any[];
  onPropertySelect: (propertyId: string) => void;
  onProviderSelect: (providerId: string) => void;
}) {
  const activeProperties = properties.filter((p) => p.status === "active");
  const activeProviders = providers.filter((p) => p.status === "active");

  // Get some sample combinations for suggestions
  const suggestions = activeProperties
    .slice(0, 3)
    .map((property) => {
      const propertyProviders = activeProviders.filter((p) =>
        p.propertyIds.includes(property.id)
      );
      return {
        property,
        providers: propertyProviders.slice(0, 2), // Show max 2 providers per property
      };
    })
    .filter((s) => s.providers.length > 0);

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">
          Quick Filter Suggestions
        </h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Try these common property-service provider combinations for focused
        analysis:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.property.id}
            className="p-3 bg-white rounded border"
          >
            <div className="flex items-center gap-2 mb-2">
              <Building size={14} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                {suggestion.property.name}
              </span>
            </div>
            <div className="space-y-1">
              {suggestion.providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    onPropertySelect(suggestion.property.id);
                    onProviderSelect(provider.id);
                  }}
                  className="w-full text-left p-2 text-xs text-purple-700 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <Activity size={12} />
                    <span className="truncate">{provider.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Filter Validation Component
function FilterValidation({
  propertyId,
  providerId,
  properties,
  providers,
  onPropertyChange,
  onProviderChange,
}: {
  propertyId: string;
  providerId: string;
  properties: Property[];
  providers: any[];
  onPropertyChange: (value: string) => void;
  onProviderChange: (value: string) => void;
}) {
  if (!propertyId || !providerId) return null;

  const property = properties.find((p) => p.id === propertyId);
  const provider = providers.find((p) => p.id === providerId);

  if (!property || !provider) return null;

  // Check if the provider actually operates at the selected property
  const providerOperatesAtProperty = provider.propertyIds.includes(propertyId);

  if (!providerOperatesAtProperty) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-red-600 mt-0.5">
            <X size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 mb-2">
              Invalid Filter Combination
            </p>
            <p className="text-sm text-red-700 mb-3">
              <strong>{provider.name}</strong> does not operate at{" "}
              <strong>{property.name}</strong>. This combination will not return
              any data.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onPropertyChange("")}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Clear Property Filter
              </button>
              <button
                onClick={() => onProviderChange("")}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Clear Provider Filter
              </button>
              <span className="text-xs text-red-600 self-center">
                Or select a valid combination
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Fallback Chart Component for when trend data is missing
function FallbackRevenueChart({
  series,
  height = "h-80",
}: {
  series: any[];
  height?: string;
}) {
  if (!series || series.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Revenue Overview
            </h3>
            <p className="text-sm text-gray-600">No data available</p>
          </div>
        </div>
      </div>
    );
  }

  // Create chart data from the series items themselves
  const chartData = series
    .filter((item) => item.revenue > 0)
    .map((item, index) => ({
      name: item.propertyName || item.providerName || `Item ${index + 1}`,
      revenue: item.revenue,
      profit: item.profit || 0,
    }))
    .slice(0, 8); // Show up to 8 items

  if (chartData.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Revenue Overview
            </h3>
            <p className="text-sm text-gray-600">No revenue data available</p>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...chartData.map((item) => item.revenue));

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${height}`}>
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="text-blue-600" size={24} />
        <h3 className="text-lg font-medium text-gray-900">Revenue Overview</h3>
        <span className="text-sm text-gray-500 capitalize">(monthly)</span>
      </div>

      {/* Bar Chart */}
      <div className="w-full h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 35 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={15}
              angle={-45}
              textAnchor="end"
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                formatCurrency(value, "USD").replace("$", "")
              }
            />
            <Tooltip
              formatter={(value: any) => [formatCurrency(value), "Revenue"]}
              labelFormatter={(label) => `Item: ${label}`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats below the chart */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-sm text-gray-600">Highest</div>
          <div className="text-lg font-semibold text-green-600">
            {formatCurrency(maxRevenue)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-lg font-semibold text-blue-600">
            {formatCurrency(
              chartData.reduce((sum, item) => sum + item.revenue, 0)
            )}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Items</div>
          <div className="text-lg font-semibold text-purple-600">
            {chartData.length}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // URL state
  const propertyId = searchParams.get("propertyId") || "";
  const providerId = searchParams.get("providerId") || "";
  const yearFilter = searchParams.get("year") || "all";
  const monthFilter = searchParams.get("month") || "all";

  // Component state
  const [properties, setProperties] = useState<Property[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [financialData, setFinancialData] = useState<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    };
    byProperty: PropertyRankItem[];
    series?: any[];
  } | null>(null);
  const [serviceProviderData, setServiceProviderData] = useState<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    };
    byProvider: any[];
    series?: any[];
  } | null>(null);
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get selected property name for display
  const selectedProperty = properties.find((p) => p.id === propertyId);
  const selectedProvider = providers.find((p) => p.id === providerId);

  // Check if user is authenticated and has proper permissions
  useEffect(() => {
    if (!authLoading) {
      if (!user || !userProfile) {
        console.log("User not authenticated, redirecting to login");
        router.push("/");
        return;
      }

      // Check if user has admin role for analytics access
      if (userProfile.role !== "admin") {
        console.log(
          "User does not have admin role, redirecting to coming-soon"
        );
        router.push("/dashboard/coming-soon");
        return;
      }
    }
  }, [user, userProfile, authLoading, router]);

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show loading state while redirecting
  if (!user || !userProfile || userProfile.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Fetch data only when authenticated
  const fetchData = async () => {
    // Don't fetch if not authenticated
    if (!user || !userProfile || userProfile.role !== "admin") {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("🔍 Fetching financial data...");
      console.log("🔍 Current filters:", {
        propertyId,
        providerId,
        yearFilter,
        monthFilter,
        status: searchParams.get("status"),
        search: searchParams.get("search"),
      });

      const api = getApi();
      console.log("🔍 API instance:", api);

      const data = await api.getCombinedFinancials({
        propertyId: propertyId || undefined,
        providerId: providerId || undefined,
        granularity: "MONTH", // Fixed to monthly for now
        from: "2024-01", // Fixed start date
        to: new Date().toISOString().split("T")[0], // Current date
      });

      console.log("🔍 Financial data received:", data);
      setFinancialData(data);

      // Extract combined data for property-provider combinations
      if (data.combinedData) {
        setCombinedData(data.combinedData);
        console.log("🔍 Combined data set:", data.combinedData);
      } else {
        setCombinedData([]);
        console.log("🔍 No combined data in response");
      }

      // Debug: Log what we received for combined filtering
      if (propertyId && providerId) {
        console.log("🔍 Combined filter debug:");
        console.log("🔍 - Property ID:", propertyId);
        console.log("🔍 - Provider ID:", providerId);
        console.log(
          "🔍 - Combined data count:",
          data.combinedData?.length || 0
        );
        console.log("🔍 - By property count:", data.byProperty?.length || 0);
        console.log("🔍 - By provider count:", data.byProvider?.length || 0);

        // Additional debugging
        console.log("🔍 - Full financial data:", data);
        console.log("🔍 - Properties in data:", data.byProperty);
        console.log("🔍 - Providers in data:", data.byProvider);
        console.log("🔍 - Combined data:", data.combinedData);
      }
    } catch (error: any) {
      console.error("❌ Error fetching financial data:", error);

      // Handle specific Firebase permission errors
      if (
        error.message?.includes("Missing or insufficient permissions") ||
        error.message?.includes("permission-denied")
      ) {
        setError(
          "You don't have permission to access this data. Please contact your administrator."
        );
      } else if (error.message?.includes("unauthenticated")) {
        setError("Please log in to access this data.");
        router.push("/");
      } else {
        setError("Failed to load financial data. Please try again later.");
      }

      setFinancialData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data when authenticated and has proper role
    if (user && userProfile && userProfile.role === "admin") {
      fetchData();
    }
  }, [user, userProfile, propertyId, providerId, yearFilter, monthFilter]);

  // Fetch properties only when authenticated
  useEffect(() => {
    const fetchProperties = async () => {
      if (!user || !userProfile || userProfile.role !== "admin") return;

      try {
        const props = await getApi().listProperties();
        setProperties(props);
      } catch (error) {
        console.error("Error fetching properties:", error);
        setError("Failed to load properties. Please try again later.");
      }
    };
    fetchProperties();
  }, [user, userProfile]);

  // Fetch providers only when authenticated
  useEffect(() => {
    const fetchProviders = async () => {
      if (!user || !userProfile || userProfile.role !== "admin") return;

      try {
        console.log("🔍 Fetching service providers for analytics...");
        const providersResponse = await ServiceProviderService.getProviders();
        console.log("🔍 Providers response:", providersResponse);

        if (providersResponse && providersResponse.providers) {
          setProviders(providersResponse.providers);
          console.log("🔍 Set providers:", providersResponse.providers.length);
        } else {
          console.warn("⚠️ No providers data in response");
          setProviders([]);
        }
      } catch (error) {
        console.error("❌ Error fetching providers:", error);
        setError("Failed to load service providers. Please try again later.");
        setProviders([]);
      }
    };
    fetchProviders();
  }, [user, userProfile]);

  // Fetch available years and months from invoice data
  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (!user || !userProfile || userProfile.role !== "admin") return;

      try {
        // Import InvoiceService dynamically to avoid circular dependencies
        const { InvoiceService } = await import("@/services/invoiceService");
        const invoices = await InvoiceService.getInvoices();

        const years = InvoiceService.getAvailableYears(invoices);
        const months = InvoiceService.getAvailableMonths(invoices);

        setAvailableYears(years);
        setAvailableMonths(months);

        console.log("🔍 Available years:", years);
        console.log("🔍 Available months:", months);
      } catch (error) {
        console.error("❌ Error fetching available dates:", error);
        // Fallback to default years
        setAvailableYears(["2024", "2023", "2022"]);
        setAvailableMonths([
          "01",
          "02",
          "03",
          "04",
          "05",
          "06",
          "07",
          "08",
          "09",
          "10",
          "11",
          "12",
        ]);
      }
    };
    fetchAvailableDates();
  }, [user, userProfile]);

  // Update URL params
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const handlePropertyChange = (value: string) => {
    updateSearchParams({ propertyId: value || null });
  };

  const handleProviderChange = (value: string) => {
    updateSearchParams({ providerId: value || null });
  };

  const clearAllFilters = () => {
    updateSearchParams({
      propertyId: null,
      providerId: null,
      year: null,
      month: null,
      status: null,
      search: null,
    });
  };

  const handleSeedServiceProviders = async () => {
    try {
      console.log("🌱 Seeding service providers...");

      const result = await ServiceProviderService.seedServiceProviders();

      if (result.success) {
        alert(
          `✅ Successfully seeded ${result.count} service providers! Refreshing data...`
        );
        // Refresh both providers and financial data
        const provs = await getApi().listProviders();
        setProviders(provs);
        fetchData();
      } else {
        alert(`❌ Failed to seed service providers: ${result.error}`);
      }
    } catch (error) {
      console.error("Error seeding service providers:", error);
      alert("❌ Error seeding service providers. Check console for details.");
    }
  };

  const handleSeedAllData = async () => {
    try {
      console.log("🌱 Seeding all data...");

      const result = await ServiceProviderService.seedAllData();

      if (result.success) {
        alert(
          `✅ Successfully seeded all data!\n` +
            `Properties: ${result.propertiesCount}\n` +
            `Service Providers: ${result.providersCount}\n` +
            `Invoices: ${result.invoicesCount}\n\n` +
            `Refreshing data...`
        );

        // Refresh all data
        const props = await getApi().listProperties();
        setProperties(props);

        const provs = await getApi().listProviders();
        setProviders(provs);

        fetchData();
      } else {
        alert(`❌ Failed to seed all data: ${result.error}`);
      }
    } catch (error) {
      console.error("Error seeding all data:", error);
      alert("❌ Error seeding all data. Check console for details.");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Error
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/dashboard/home")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Data Available
          </h3>
          <p className="text-gray-600">
            No financial data found for the selected criteria.
          </p>
        </div>
      </div>
    );
  }

  const { summary, byProperty, series } = financialData;

  const timePeriodText = (() => {
    if (yearFilter !== "all" && monthFilter !== "all") {
      return `${getMonthName(monthFilter)} ${yearFilter}`;
    } else if (yearFilter !== "all") {
      return yearFilter;
    } else if (monthFilter !== "all") {
      return getMonthName(monthFilter);
    } else {
      return "All time data";
    }
  })();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Financial Analytics
            </h1>
            <p className="text-gray-600">
              In-depth analysis for {selectedProperty?.name || "All Properties"}{" "}
              • {timePeriodText}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSeedServiceProviders}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🌱 Seed Service Providers
            </button>
            <button
              onClick={handleSeedAllData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🌱 Seed All Data
            </button>
          </div>
        </div>

        {/* Smart Filter Suggestions */}
        {!propertyId && !providerId && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 mt-0.5">
                <Building size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Filtering Tips
                </p>
                <p className="text-sm text-blue-700">
                  For precise analysis, try filtering by property and/or service
                  provider. You can combine both filters to see specific
                  provider performance at specific properties.
                </p>
              </div>
            </div>
          </div>
        )}

        {propertyId && !providerId && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-green-600 mt-0.5">
                <Building size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 mb-1">
                  Property Analysis Active
                </p>
                <p className="text-sm text-green-700">
                  Viewing data for {selectedProperty?.name}. Add a service
                  provider filter to see specific provider performance at this
                  property.
                </p>
              </div>
            </div>
          </div>
        )}

        {providerId && !propertyId && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-purple-600 mt-0.5">
                <Activity size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900 mb-1">
                  Service Provider Analysis Active
                </p>
                <p className="text-sm text-purple-700">
                  Viewing data for {selectedProvider?.name}. Add a property
                  filter to see this provider's performance at specific
                  properties.
                </p>
              </div>
            </div>
          </div>
        )}

        {propertyId && providerId && (
          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-indigo-600 mt-0.5">
                <BarChart3 size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-indigo-900 mb-1">
                  Combined Analysis Active
                </p>
                <p className="text-sm text-indigo-700">
                  Viewing precise performance data for {selectedProvider?.name}{" "}
                  at {selectedProperty?.name}. This shows the specific
                  relationship between this provider and property.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="mb-6">
        {/* Search Field */}
        <div className="mb-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by invoice #, description, provider, or property..."
              value={searchParams.get("search") || ""}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value) {
                  params.set("search", e.target.value);
                } else {
                  params.delete("search");
                }
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Search across invoice numbers, descriptions, service providers, and
            property names
          </div>
          {/* Quick Search Suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Quick search:</span>
            {[
              "INV-2024",
              "CleanPro",
              "Parking",
              "Flour Market",
              "Paid",
              "Overdue",
            ].map((term) => (
              <button
                key={term}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("search", term);
                  router.push(`${pathname}?${params.toString()}`);
                }}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Property
            </label>
            <PropertySelect
              properties={properties}
              value={propertyId}
              onChange={handlePropertyChange}
            />
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Service Provider
            </label>
            <ServiceProviderSelect
              providers={providers}
              value={providerId}
              onChange={handleProviderChange}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <div className="flex gap-2">
              <select
                value={yearFilter}
                onChange={(e) =>
                  updateSearchParams({ year: e.target.value || null })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={monthFilter}
                onChange={(e) =>
                  updateSearchParams({ month: e.target.value || null })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Months</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {getMonthName(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Invoice Status
            </label>
            <select
              value={searchParams.get("status") || "all"}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value !== "all") {
                  params.set("status", e.target.value);
                } else {
                  params.delete("status");
                }
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="sent">Sent</option>
              <option value="overdue">Overdue</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border">
              Monthly Analysis
            </div>
          </div>

          {(propertyId ||
            providerId ||
            yearFilter !== "all" ||
            monthFilter !== "all" ||
            searchParams.get("status") ||
            searchParams.get("search")) && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {(propertyId ||
          providerId ||
          yearFilter !== "all" ||
          monthFilter !== "all" ||
          searchParams.get("status") ||
          searchParams.get("search")) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {propertyId && selectedProperty && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                <Building size={12} />
                Property: {selectedProperty.name}
                <button
                  onClick={() => handlePropertyChange("")}
                  className="ml-1 hover:text-green-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {providerId && selectedProvider && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                <Activity size={12} />
                Provider: {selectedProvider.name}
                <button
                  onClick={() => handleProviderChange("")}
                  className="ml-1 hover:text-purple-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {yearFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                <Calendar size={12} />
                Year: {yearFilter}
                <button
                  onClick={() => updateSearchParams({ year: null })}
                  className="ml-1 hover:text-purple-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {monthFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                <Calendar size={12} />
                Month: {monthFilter}
                <button
                  onClick={() => updateSearchParams({ month: null })}
                  className="ml-1 hover:text-orange-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {searchParams.get("status") && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                <Activity size={12} />
                Status: {searchParams.get("status")?.charAt(0).toUpperCase()}
                {searchParams.get("status")?.slice(1)}
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete("status");
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  className="ml-1 hover:text-indigo-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {searchParams.get("search") && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 text-sm rounded-full">
                <Search size={12} />
                Search: "{searchParams.get("search")}"
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete("search");
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  className="ml-1 hover:text-teal-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter Validation */}
      <FilterValidation
        propertyId={propertyId}
        providerId={providerId}
        properties={properties}
        providers={providers}
        onPropertyChange={handlePropertyChange}
        onProviderChange={handleProviderChange}
      />

      {/* Data Scope Summary */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-600 font-medium">Data Scope:</span>
            <div className="text-blue-800">
              {propertyId ? "Single Property" : "All Properties"}
              {providerId && " + Service Provider"}
              {searchParams.get("status") &&
                ` + ${searchParams
                  .get("status")
                  ?.charAt(0)
                  .toUpperCase()}${searchParams
                  .get("status")
                  ?.slice(1)} Status`}
              {yearFilter !== "all" && ` + ${yearFilter}`}
              {monthFilter !== "all" && ` + ${getMonthName(monthFilter)}`}
            </div>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Properties:</span>
            <div className="text-blue-800">
              {propertyId
                ? "1 (Filtered)"
                : properties.filter((p) => p.status === "active").length}
            </div>
          </div>
          <div>
            <span className="text-blue-600 font-medium">
              Service Providers:
            </span>
            <div className="text-blue-800">
              {providerId
                ? "1 (Filtered)"
                : providers.filter((p) => p.status === "active").length}
            </div>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Time Granularity:</span>
            <div className="text-blue-800">Monthly</div>
          </div>
        </div>
      </div>

      {/* Summary Insights */}
      {financialData && (
        <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
          <h3 className="text-lg font-semibold text-indigo-900 mb-4">
            Analytics Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 mb-1">
                {financialData.byProperty.length}
              </div>
              <div className="text-sm text-indigo-800">
                Properties with Data
              </div>
              <div className="text-xs text-indigo-600 mt-1">
                {propertyId
                  ? "Single property view"
                  : "Multi-property analysis"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {providerId
                  ? "1"
                  : providers.filter((p) => p.status === "active").length}
              </div>
              <div className="text-sm text-purple-800">Service Providers</div>
              <div className="text-xs text-purple-600 mt-1">
                {providerId
                  ? "Single provider view"
                  : "Multi-provider analysis"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                Monthly
              </div>
              <div className="text-sm text-blue-800">Data Granularity</div>
              <div className="text-xs text-blue-600 mt-1">
                Monthly performance analysis
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Information */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">
            Debug: Properties: {properties.length}, Providers:{" "}
            {providers.length}
          </h3>
          <div className="text-xs text-yellow-700">
            Selected Property: {propertyId || "None"} | Selected Provider:{" "}
            {providerId || "None"}
          </div>
        </div>
      )}

      {/* Quick Filter Suggestions */}
      {!propertyId && !providerId && (
        <QuickFilterSuggestions
          properties={properties}
          providers={providers}
          onPropertySelect={handlePropertyChange}
          onProviderSelect={handleProviderChange}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(summary.revenue)}
          icon={<DollarSign size={24} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          trend={
            series?.[0]?.revenueDeltaPct
              ? {
                  value: series[0].revenueDeltaPct,
                  label: "vs previous period",
                }
              : undefined
          }
        />
        {summary.expenses !== undefined && (
          <KPICard
            title="Total Expenses"
            value={formatCurrency(summary.expenses)}
            icon={<DollarSign size={24} />}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
        )}
        {summary.profit !== undefined && (
          <KPICard
            title="Total Profit"
            value={formatCurrency(summary.profit)}
            subtitle={`${summary.marginPct?.toFixed(1)}% margin`}
            icon={<TrendingUp size={24} />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            trend={
              series?.[0]?.profitDeltaPct
                ? {
                    value: series[0].profitDeltaPct,
                    label: "vs previous period",
                  }
                : undefined
            }
          />
        )}
        <KPICard
          title="Payment Rate"
          value={`${Math.round(summary.invoicesPaidPct || 0)}%`}
          subtitle={`${(summary.invoicesPaidPct || 0).toFixed(
            1
          )}% invoices paid`}
          icon={<Activity size={24} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend Chart or Fallback Chart */}
        {series && series.some((s) => s.trend && s.trend.length > 0) ? (
          <RevenueTrendChart series={series} height="h-[500px]" />
        ) : (
          <FallbackRevenueChart series={series || []} height="h-[500px]" />
        )}

        {/* Property Performance Comparison or Combined Performance */}
        {propertyId && providerId ? (
          <CombinedPerformanceTable
            combinedData={combinedData}
            height="h-[500px]"
          />
        ) : (
          <PropertyPerformanceTable
            byProperty={byProperty}
            height="h-[500px]"
          />
        )}
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Profit Margin Analysis */}
        <ProfitMarginTable series={series || []} height="h-64" />

        {/* Growth Metrics */}
        <GrowthMetricsTable series={series || []} height="h-64" />
      </div>

      {/* Invoice Performance */}
      <div className="mb-8">
        <InvoicePerformanceTable series={series || []} height="h-64" />
      </div>

      {/* Service Provider Analytics Section */}
      {serviceProviderData && (
        <>
          {/* Service Provider KPI Cards */}
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Service Provider Analytics
              </h2>
              <p className="text-gray-600">
                {providerId
                  ? `Performance metrics for ${selectedProvider?.name}`
                  : "Comprehensive service provider performance analysis"}{" "}
                • {timePeriodText}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard
                title="Provider Revenue"
                value={formatCurrency(serviceProviderData.summary.revenue)}
                icon={<DollarSign size={24} />}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                trend={
                  serviceProviderData.series?.[0]?.revenueDeltaPct
                    ? {
                        value: serviceProviderData.series[0].revenueDeltaPct,
                        label: "vs previous period",
                      }
                    : undefined
                }
              />
              {serviceProviderData.summary.expenses !== undefined && (
                <KPICard
                  title="Provider Expenses"
                  value={formatCurrency(serviceProviderData.summary.expenses)}
                  icon={<DollarSign size={24} />}
                  iconBg="bg-red-100"
                  iconColor="text-red-600"
                />
              )}
              {serviceProviderData.summary.profit !== undefined && (
                <KPICard
                  title="Provider Profit"
                  value={formatCurrency(serviceProviderData.summary.profit)}
                  subtitle={`${serviceProviderData.summary.marginPct?.toFixed(
                    1
                  )}% margin`}
                  icon={<TrendingUp size={24} />}
                  iconBg="bg-blue-100"
                  iconColor="text-blue-600"
                  trend={
                    serviceProviderData.series?.[0]?.profitDeltaPct
                      ? {
                          value: serviceProviderData.series[0].profitDeltaPct,
                          label: "vs previous period",
                        }
                      : undefined
                  }
                />
              )}
              <KPICard
                title="Provider Payment Rate"
                value={`${Math.round(
                  serviceProviderData.summary.invoicesPaidPct || 0
                )}%`}
                subtitle={`${(
                  serviceProviderData.summary.invoicesPaidPct || 0
                ).toFixed(1)}% invoices paid`}
                icon={<Activity size={24} />}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
              />
            </div>

            {/* Service Provider Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Service Provider Revenue Trend Chart */}
              <RevenueTrendChart
                series={serviceProviderData.series || []}
                height="h-[500px]"
              />

              {/* Service Provider Performance Comparison */}
              <ServiceProviderPerformanceTable
                byProvider={serviceProviderData.byProvider}
                height="h-[500px]"
              />
            </div>

            {/* Top Service Providers Table */}
            {!providerId && serviceProviderData.byProvider.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Top Service Providers by Revenue ({timePeriodText})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Margin %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoices Paid %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {serviceProviderData.byProvider.map((provider) => (
                        <tr
                          key={provider.providerId}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Activity
                                className="text-gray-400 mr-2"
                                size={16}
                              />
                              <div className="text-sm font-medium text-gray-900">
                                {provider.providerName}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatCurrency(provider.revenue)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {provider.profit
                                ? formatCurrency(provider.profit)
                                : "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {provider.marginPct
                                ? `${provider.marginPct.toFixed(1)}%`
                                : "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {(provider.invoicesPaidPct || 0).toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() =>
                                updateSearchParams({
                                  providerId: provider.providerId,
                                })
                              }
                              className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm font-medium"
                            >
                              View Details
                              <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Top Properties Table */}
      {!propertyId && byProperty.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Properties by Revenue ({timePeriodText})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoices Paid %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byProperty.map((property) => (
                  <tr key={property.propertyId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="text-gray-400 mr-2" size={16} />
                        <div className="text-sm font-medium text-gray-900">
                          {property.propertyName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(property.revenue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {property.profit
                          ? formatCurrency(property.profit)
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {property.marginPct
                          ? `${property.marginPct.toFixed(1)}%`
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(property.invoicesPaidPct || 0).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() =>
                          updateSearchParams({
                            propertyId: property.propertyId,
                          })
                        }
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Combined Performance Table */}
      {combinedData && combinedData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Combined Performance ({timePeriodText})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <CombinedPerformanceTable combinedData={combinedData} />
          </div>
        </div>
      )}

      {/* Historical Data Table */}
      {series && series.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Historical Performance Data
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {propertyId
                ? `Performance history for ${selectedProperty?.name} across all months`
                : `Aggregate performance across all properties for monthly periods`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoices
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {series.map((item) => (
                  <tr key={item.propertyId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.trend && item.trend.length > 0
                          ? formatPeriodLabel(item.trend[0].label, "MONTH")
                          : "Current Period"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(item.revenue, item.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.profit
                          ? formatCurrency(item.profit, item.currency)
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.revenueDeltaPct !== undefined &&
                        item.revenueDeltaPct !== 0 ? (
                          <>
                            {getGrowthIcon(item.revenueDeltaPct)}
                            <span
                              className={`text-sm ml-1 ${getGrowthColor(
                                item.revenueDeltaPct
                              )}`}
                            >
                              {formatPercentage(item.revenueDeltaPct)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.invoices?.paid || 0}/{item.invoices?.total || 0}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

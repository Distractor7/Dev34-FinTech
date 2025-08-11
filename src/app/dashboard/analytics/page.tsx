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
} from "recharts";

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
      property.address?.toLowerCase().includes(searchTerm.toLowerCase())
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
                      {property.address}
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

  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.service.toLowerCase().includes(searchTerm.toLowerCase())
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
  granularity,
  height = "h-80",
}: {
  series: any[];
  granularity: PeriodGranularity;
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
        period: formatPeriodLabel(item.label, granularity),
        revenue: item.revenue,
        shortLabel: item.label,
      }))
      .sort((a: any, b: any) => a.shortLabel.localeCompare(b.shortLabel));

    // Apply appropriate slicing based on granularity
    if (granularity === "WEEK" || granularity === "MONTH") {
      chartData = chartData.slice(-8); // Show last 8 periods
    }
  } else {
    // Fallback to individual property/provider aggregation
    if (granularity === "WEEK") {
      // For weekly view, aggregate data across all items for each week
      const weeklyData: { [key: string]: number } = {};

      series.forEach((item) => {
        if (item.trend && Array.isArray(item.trend)) {
          item.trend.forEach((trendItem: any) => {
            if (!weeklyData[trendItem.label]) {
              weeklyData[trendItem.label] = 0;
            }
            weeklyData[trendItem.label] += trendItem.revenue || 0;
          });
        }
      });

      // Convert to chart format and sort by week
      chartData = Object.entries(weeklyData)
        .map(([label, revenue]) => ({
          period: formatPeriodLabel(label, granularity),
          revenue,
          shortLabel: label,
        }))
        .sort((a, b) => a.shortLabel.localeCompare(b.shortLabel))
        .slice(-8); // Show last 8 weeks
    } else if (granularity === "YEAR") {
      // For yearly view, aggregate data across all items for each year
      const yearlyData: { [key: string]: number } = {};

      series.forEach((item) => {
        if (item.trend && Array.isArray(item.trend)) {
          item.trend.forEach((trendItem: any) => {
            if (!yearlyData[trendItem.label]) {
              yearlyData[trendItem.label] = 0;
            }
            yearlyData[trendItem.label] += trendItem.revenue || 0;
          });
        }
      });

      // Convert to chart format and sort by year
      chartData = Object.entries(yearlyData)
        .map(([label, revenue]) => ({
          period: formatPeriodLabel(label, granularity),
          revenue,
          shortLabel: label,
        }))
        .sort((a, b) => a.shortLabel.localeCompare(b.shortLabel));
    } else {
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
          period: formatPeriodLabel(label, granularity),
          revenue,
          shortLabel: label,
        }))
        .sort((a, b) => a.shortLabel.localeCompare(b.shortLabel))
        .slice(-8); // Show last 8 months
    }
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
              Revenue Trend
            </h3>
            <p className="text-sm text-gray-600">No trend data available</p>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your filters or time period
            </p>
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
        <span className="text-sm text-gray-500 capitalize">
          ({granularity.toLowerCase()})
        </span>
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

export default function AnalyticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const propertyId = searchParams.get("propertyId") || "";
  const providerId = searchParams.get("providerId") || "";
  const granularity = (searchParams.get("g") as PeriodGranularity) || "MONTH";
  const from = searchParams.get("from") || "2024-01";

  // Component state
  const [properties, setProperties] = useState<Property[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
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

  // Get selected property name for display
  const selectedProperty = properties.find((p) => p.id === propertyId);
  const selectedProvider = providers.find((p) => p.id === providerId);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use the new combined API for better filtering precision
      const combinedData = await getApi().getCombinedFinancials({
        propertyId: propertyId || undefined,
        providerId: providerId || undefined,
        from,
        to: from, // Use same period for analytics
        granularity,
      });

      // Set combined data for the new combined performance table
      setCombinedData(combinedData.combinedData || []);

      // For financial data, we need to ensure we have the right structure
      if (propertyId && providerId) {
        // Both filters active - use the combined data structure
        setFinancialData({
          summary: combinedData.summary,
          byProperty: combinedData.byProperty,
          series: combinedData.series || [],
        });

        setServiceProviderData({
          summary: combinedData.summary,
          byProvider: combinedData.byProvider,
          series: combinedData.series || [],
        });
      } else {
        // Single filter or no filter - fall back to individual APIs for better data structure
        const [propertyData, providerData] = await Promise.all([
          getApi().getPropertyFinancials({
            propertyId: propertyId || undefined,
            from,
            to: from,
            granularity,
          }),
          getApi().getServiceProviderFinancials({
            providerId: providerId || undefined,
            from,
            to: from,
            granularity,
          }),
        ]);

        setFinancialData(propertyData);
        setServiceProviderData(providerData);
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  }, [propertyId, providerId, from, granularity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const props = await getApi().listProperties();
        setProperties(props);
      } catch (error) {
        console.error("Error fetching properties:", error);
      }
    };
    fetchProperties();
  }, []);

  // Fetch providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const provs = await getApi().listProviders();
        setProviders(provs);
      } catch (error) {
        console.error("Error fetching providers:", error);
      }
    };
    fetchProviders();
  }, []);

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

  const handleGranularityChange = (value: PeriodGranularity) => {
    updateSearchParams({ g: value });
  };

  const handlePeriodChange = (value: string) => {
    updateSearchParams({ from: value });
  };

  const clearAllFilters = () => {
    updateSearchParams({
      propertyId: null,
      providerId: null,
      g: "MONTH",
      from: "2024-01",
    });
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Financial Analytics
        </h1>
        <p className="text-gray-600">
          {propertyId && providerId
            ? `Performance analysis for ${selectedProvider?.name} at ${selectedProperty?.name}`
            : propertyId
            ? `In-depth analysis for ${selectedProperty?.name}`
            : providerId
            ? `In-depth analysis for ${selectedProvider?.name}`
            : "Comprehensive financial performance analysis across all properties and service providers"}{" "}
          • {formatPeriodLabel(from, granularity)}
        </p>

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
            <PeriodSelector
              granularity={granularity}
              value={from}
              onChange={handlePeriodChange}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <GranularityTabs
              value={granularity}
              onChange={handleGranularityChange}
            />
          </div>

          {(propertyId ||
            providerId ||
            granularity !== "MONTH" ||
            from !== "2024-01") && (
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
          granularity !== "MONTH" ||
          from !== "2024-01") && (
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
            {granularity !== "MONTH" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                {granularity === "WEEK"
                  ? "Weekly"
                  : granularity === "YEAR"
                  ? "Yearly"
                  : "Monthly"}
                <button
                  onClick={() => handleGranularityChange("MONTH")}
                  className="ml-1 hover:text-purple-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {from !== "2024-01" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                <Calendar size={12} />
                Period: {formatPeriodLabel(from, granularity)}
                <button
                  onClick={() => handlePeriodChange("2024-01")}
                  className="ml-1 hover:text-blue-600"
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

      {/* Data Summary Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">
            Data Scope Summary
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Properties:</span>
            <span className="ml-2 font-medium text-gray-900">
              {propertyId
                ? "1 (Filtered)"
                : `${
                    properties.filter((p) => p.status === "active").length
                  } (All Active)`}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Service Providers:</span>
            <span className="ml-2 font-medium text-gray-900">
              {providerId
                ? "1 (Filtered)"
                : `${
                    providers.filter((p) => p.status === "active").length
                  } (All Active)`}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Time Period:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatPeriodLabel(from, granularity)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Data Granularity:</span>
            <span className="ml-2 font-medium text-gray-900 capitalize">
              {granularity.toLowerCase()}
            </span>
          </div>
        </div>

        {propertyId && providerId && (
          <div className="mt-3 p-3 bg-indigo-100 border border-indigo-200 rounded">
            <p className="text-sm text-indigo-800">
              <strong>Precise Filter:</strong> Showing data for{" "}
              {selectedProvider?.name} specifically at {selectedProperty?.name}.
              This represents the exact relationship between this service
              provider and property location.
            </p>
          </div>
        )}

        {propertyId && !providerId && (
          <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <strong>Property Filter:</strong> Showing data for{" "}
              {selectedProperty?.name} across all service providers. This gives
              you a comprehensive view of the property's performance.
            </p>
          </div>
        )}

        {providerId && !propertyId && (
          <div className="mt-3 p-3 bg-purple-100 border border-purple-200 rounded">
            <p className="text-sm text-purple-800">
              <strong>Service Provider Filter:</strong> Showing data for{" "}
              {selectedProvider?.name} across all properties. This gives you a
              comprehensive view of the provider's performance.
            </p>
          </div>
        )}

        {!propertyId && !providerId && (
          <div className="mt-3 p-3 bg-blue-100 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Aggregate View:</strong> Showing combined data across all
              properties and service providers. Use filters to drill down into
              specific relationships.
            </p>
          </div>
        )}
      </div>

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
        {/* Revenue Trend Chart */}
        <RevenueTrendChart
          series={series || []}
          granularity={granularity}
          height="h-[500px]"
        />

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
                • {formatPeriodLabel(from, granularity)}
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
                granularity={granularity}
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
                    Top Service Providers by Revenue (
                    {formatPeriodLabel(from, granularity)})
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
              Top Properties by Revenue ({formatPeriodLabel(from, granularity)})
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
              Combined Performance ({formatPeriodLabel(from, granularity)})
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
                ? `Performance history for ${
                    selectedProperty?.name
                  } across all ${
                    granularity === "WEEK"
                      ? "weeks"
                      : granularity === "YEAR"
                      ? "years"
                      : "months"
                  }`
                : `Aggregate performance across all properties for ${
                    granularity === "WEEK"
                      ? "weekly"
                      : granularity === "YEAR"
                      ? "yearly"
                      : "monthly"
                  } periods`}
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
                          ? formatPeriodLabel(item.trend[0].label, granularity)
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
                        {item.invoices.paid}/{item.invoices.total}
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

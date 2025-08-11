"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  Building,
  ArrowRight,
  X,
  FileText,
} from "lucide-react";
import { Property, PeriodGranularity, PropertyRankItem } from "@/types/float34";
import { getApi } from "@/lib/api";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Helper function to get default period range
function getDefaultPeriodRange(granularity: PeriodGranularity): {
  from: string;
  to: string;
} {
  const to = new Date();
  let from = new Date();

  switch (granularity) {
    case "WEEK":
      from.setDate(from.getDate() - 84); // 12 weeks
      break;
    case "MONTH":
      from.setMonth(from.getMonth() - 12); // 12 months
      break;
    case "YEAR":
      from.setFullYear(from.getFullYear() - 5); // 5 years
      break;
  }

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// Helper function to format currency
function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

// Helper function to format percentage
function formatPercentage(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// Helper function to get growth color
function getGrowthColor(growth: number) {
  return growth >= 0 ? "text-green-600" : "text-red-600";
}

// Helper function to get growth icon
function getGrowthIcon(growth: number) {
  return growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
}

// Helper function to format period labels
function formatPeriodLabel(
  period: string,
  granularity: PeriodGranularity
): string {
  switch (granularity) {
    case "WEEK":
      // Convert "2024-W03" to "Week 3, 2024"
      const weekMatch = period.match(/^(\d{4})-W(\d{2})$/);
      if (weekMatch) {
        return `Week ${parseInt(weekMatch[2])}, ${weekMatch[1]}`;
      }
      return period;
    case "MONTH":
      // Convert "2024-01" to "January 2024"
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
      // Already in "YYYY" format
      return period;
    default:
      return period;
  }
}

// Delta Badge Component
function DeltaBadge({ value, label }: { value?: number; label: string }) {
  if (value === undefined || value === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {getGrowthIcon(value)}
      <span className={`text-sm font-medium ${getGrowthColor(value)}`}>
        {formatPercentage(value)}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// KPI Card Component
function KPICard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  delta,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  delta?: { value: number; label: string };
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center">
        <div className={`p-2 ${iconBg} rounded-lg`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {delta && <DeltaBadge value={delta.value} label={delta.label} />}
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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">All properties</option>
      {properties.map((property) => (
        <option key={property.id} value={property.id}>
          {property.name}
        </option>
      ))}
    </select>
  );
}

// Period Selector Component
function PeriodSelector({
  granularity,
  value,
  onChange,
  propertyId,
}: {
  granularity: PeriodGranularity;
  value: string;
  onChange: (value: string) => void;
  propertyId?: string;
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
  const selectedOption =
    options.find((opt) => opt.value === value) || options[0];

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {propertyId ? "Select Period" : "Current Period"}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
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
  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange("WEEK")}
        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
          value === "WEEK"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Weekly Reports
      </button>
      <button
        onClick={() => onChange("MONTH")}
        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
          value === "MONTH"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Monthly Reports
      </button>
      <button
        onClick={() => onChange("YEAR")}
        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
          value === "YEAR"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Yearly Reports
      </button>
    </div>
  );
}

export default function FinancialReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const propertyId = searchParams.get("propertyId") || "";
  const granularity = (searchParams.get("g") as PeriodGranularity) || "MONTH";
  const from =
    searchParams.get("from") || getDefaultPeriodRange(granularity).from;
  const to = searchParams.get("to") || getDefaultPeriodRange(granularity).to;

  // Component state
  const [properties, setProperties] = useState<Property[]>([]);
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
  const [loading, setLoading] = useState(true);

  // Debounced date range for API calls
  const debouncedFrom = useDebounce(from, 500);
  const debouncedTo = useDebounce(to, 500);

  // Get selected property name for display
  const selectedProperty = properties.find((p) => p.id === propertyId);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const api = getApi();
      const [propertiesData, financialData] = await Promise.all([
        api.listProperties(),
        api.getPropertyFinancials({
          propertyId: propertyId || undefined,
          from: debouncedFrom,
          to: debouncedTo,
          granularity,
        }),
      ]);
      setProperties(propertiesData);
      setFinancialData(financialData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [propertyId, debouncedFrom, debouncedTo, granularity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL params
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
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

  const handleGranularityChange = (value: PeriodGranularity) => {
    updateSearchParams({ g: value });
  };

  const clearAllFilters = () => {
    updateSearchParams({
      propertyId: null,
      g: "MONTH",
    });
  };

  const exportFinancialReport = () => {
    // Mock export function
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Property,Revenue,Profit,Margin%,Invoices Paid%\n" +
      (financialData?.byProperty
        .map(
          (p) =>
            `${p.propertyName},${p.revenue},${p.profit || 0},${
              p.marginPct || 0
            },${p.invoicesPaidPct || 0}`
        )
        .join("\n") || "");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial-report-${from}-to-${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigateToAnalytics = (propertyId: string) => {
    const params = new URLSearchParams({
      propertyId,
      from,
      to,
      g: granularity,
    });
    router.push(`/dashboard/analytics?${params.toString()}`);
  };

  const navigateToAllReports = () => {
    const params = new URLSearchParams({
      from,
      to,
      g: granularity,
    });
    router.push(
      `/dashboard/financial-reports/all-reports?${params.toString()}`
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
      <div className="p-6 text-center">
        <p className="text-gray-500">No financial data available</p>
      </div>
    );
  }

  const { summary, byProperty } = financialData;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Financial Reports
          </h1>
          <p className="text-gray-600">
            {granularity === "WEEK" &&
              `Weekly financial performance analytics - Current period: ${formatPeriodLabel(
                from,
                granularity
              )}`}
            {granularity === "MONTH" &&
              `Monthly financial performance analytics - Current period: ${formatPeriodLabel(
                from,
                granularity
              )}`}
            {granularity === "YEAR" &&
              `Yearly financial performance analytics - Current period: ${formatPeriodLabel(
                from,
                granularity
              )}`}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={navigateToAllReports}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileText size={20} />
            View All Reports
          </button>
          <button
            onClick={exportFinancialReport}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={20} />
            Export Report
          </button>
        </div>
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

          <div>
            <PeriodSelector
              granularity={granularity}
              value={from}
              onChange={(value) => updateSearchParams({ from: value })}
              propertyId={propertyId}
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

          {(propertyId || granularity !== "MONTH") && (
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
        {(propertyId || granularity !== "MONTH") && (
          <div className="mt-3 flex flex-wrap gap-2">
            {propertyId && selectedProperty && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Property: {selectedProperty.name}
                <button
                  onClick={() => handlePropertyChange("")}
                  className="ml-1 hover:text-green-600"
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
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Revenue"
          value={formatCurrency(summary.revenue)}
          icon={<DollarSign size={24} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />

        {summary.expenses !== undefined && (
          <KPICard
            title="Expenses"
            value={formatCurrency(summary.expenses)}
            icon={<DollarSign size={24} />}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
        )}

        {summary.profit !== undefined && (
          <KPICard
            title="Profit"
            value={formatCurrency(summary.profit)}
            subtitle={
              summary.marginPct
                ? `${summary.marginPct.toFixed(1)}% margin`
                : undefined
            }
            icon={<TrendingUp size={24} />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
        )}

        <KPICard
          title="Invoices"
          value={`${Math.round(summary.invoicesPaidPct || 0)}% paid`}
          subtitle={`${(summary.invoicesPaidPct || 0).toFixed(
            1
          )}% payment rate`}
          icon={<BarChart3 size={24} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Top Properties Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {propertyId
              ? `${selectedProperty?.name} Performance`
              : `Top Properties by Revenue (${formatPeriodLabel(
                  from,
                  granularity
                )})`}
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
                      {property.invoicesPaidPct
                        ? `${property.invoicesPaidPct.toFixed(1)}%`
                        : "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => navigateToAnalytics(property.propertyId)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      View Analytics
                      <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial History Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {granularity === "WEEK"
              ? "Weekly"
              : granularity === "YEAR"
              ? "Yearly"
              : "Monthly"}{" "}
            Financial History
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {propertyId
              ? `Showing ${
                  granularity === "WEEK"
                    ? "weekly"
                    : granularity === "YEAR"
                    ? "yearly"
                    : "monthly"
                } performance for ${
                  selectedProperty?.name
                } in ${formatPeriodLabel(from, granularity)}`
              : `Showing ${
                  granularity === "WEEK"
                    ? "weekly"
                    : granularity === "YEAR"
                    ? "yearly"
                    : "monthly"
                } performance for all properties in ${formatPeriodLabel(
                  from,
                  granularity
                )}`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
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
              {financialData.series?.map((item) => (
                <tr key={item.propertyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building className="text-gray-400 mr-2" size={16} />
                      <div className="text-sm font-medium text-gray-900">
                        {item.propertyName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPeriodLabel(from, granularity)}
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

      {/* Trends Panel */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Revenue Trends
        </h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <BarChart3 className="mx-auto h-12 w-12 mb-2" />
            <p>Chart visualization coming soon</p>
            <p className="text-sm">
              {propertyId
                ? `Showing ${
                    granularity === "WEEK"
                      ? "weekly"
                      : granularity === "YEAR"
                      ? "yearly"
                      : "monthly"
                  } trends for ${selectedProperty?.name}`
                : `Showing aggregate ${
                    granularity === "WEEK"
                      ? "weekly"
                      : granularity === "YEAR"
                      ? "yearly"
                      : "monthly"
                  } trends across all properties for ${formatPeriodLabel(
                    from,
                    granularity
                  )}`}
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!loading && byProperty.length === 0 && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No financial data found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Try another date range or clear the property filter.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

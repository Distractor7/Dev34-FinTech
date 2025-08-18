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
import FinancialService, {
  FinancialSummary,
  PropertyFinancialData,
  FinancialTimeSeries,
} from "@/services/financialService";

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
  const now = new Date();
  let from = new Date();
  let to = new Date();

  switch (granularity) {
    case "WEEK":
      from.setDate(from.getDate() - 84); // 12 weeks
      to = now; // Current date
      break;
    case "MONTH":
      from.setMonth(from.getMonth() - 12); // 12 months
      to = now; // Current date
      break;
    case "YEAR":
      // For yearly reports, default to current year
      from = new Date(now.getFullYear(), 0, 1); // January 1st of current year
      to = new Date(now.getFullYear(), 11, 31); // December 31st of current year
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
    const now = new Date();
    const periods = [];

    switch (g) {
      case "WEEK":
        // Generate 52 weeks back and 4 weeks forward
        for (let i = -52; i <= 4; i++) {
          const date = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
          const weekNumber = getWeekNumber(date);
          periods.push({
            value: `${date.getFullYear()}-W${weekNumber
              .toString()
              .padStart(2, "0")}`,
            label: `Week ${weekNumber}, ${date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}`,
          });
        }
        break;

      case "MONTH":
        // Generate 24 months back and 6 months forward
        for (let i = -24; i <= 6; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
          periods.push({
            value: `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}`,
            label: date.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            }),
          });
        }
        break;

      case "YEAR":
        // Generate 10 years back and 2 years forward
        for (let i = -10; i <= 2; i++) {
          const year = now.getFullYear() + i;
          periods.push({
            value: year.toString(),
            label: year.toString(),
          });
        }
        break;
    }

    return periods.reverse(); // Show oldest first
  };

  // Helper function to get week number
  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
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
      // Get properties from PropertyService
      const PropertyService = await import("@/services/propertyService");
      const propertiesData =
        await PropertyService.PropertyService.getProperties();

      // Get financial data from FinancialService
      const [financialSummary, propertyFinancials, timeSeriesData] =
        await Promise.all([
          FinancialService.getFinancialSummary(debouncedFrom, debouncedTo),
          FinancialService.getPropertyFinancials(debouncedFrom, debouncedTo),
          FinancialService.getTimeSeriesData(
            debouncedFrom,
            debouncedTo,
            granularity
          ),
        ]);

      setProperties(propertiesData);

      // Transform data to match expected format
      const transformedFinancialData = {
        summary: {
          revenue: financialSummary.revenue,
          expenses: financialSummary.expenses,
          profit: financialSummary.profit,
          marginPct: financialSummary.marginPct,
          invoicesPaidPct: financialSummary.invoicesPaidPct,
        },
        byProperty: propertyFinancials.map((pf) => ({
          propertyId: pf.propertyId,
          propertyName: pf.propertyName,
          revenue: pf.revenue,
          profit: pf.profit,
          marginPct: pf.marginPct,
          invoicesPaidPct: pf.invoicesPaidPct,
        })),
        series: timeSeriesData.map((ts) => ({
          period: ts.period,
          revenue: ts.revenue,
          expenses: ts.expenses,
          profit: ts.profit,
          invoiceCount: ts.invoiceCount,
        })),
      };

      setFinancialData(transformedFinancialData);
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
        <div className="max-w-md mx-auto">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Financial Data Available
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by adding some sample data or creating your first
            invoices to see financial reports.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => FinancialService.seedSampleData()}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Sample Data
            </button>
            <button
              onClick={() => router.push("/dashboard/invoices")}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Invoice
            </button>
          </div>
        </div>
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
        <div className="flex items-center space-x-2">
          <button
            onClick={() => FinancialService.debugDatabaseState()}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            title="Debug database state"
          >
            🐛 Debug
          </button>
          <button
            onClick={() => FinancialService.restoreRealInvoiceData()}
            className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
            title="Restore real invoice data"
          >
            🔄 Restore
          </button>
          <button
            onClick={() => FinancialService.createMissingPropertyForInvoice()}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            title="Create missing property for existing invoice"
          >
            🏗️ Fix Data
          </button>
          <button
            onClick={() => FinancialService.clearAndReseedSampleData()}
            className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
            title="Clear and recreate sample data"
          >
            🔄 Reset Data
          </button>
          <button
            onClick={() => FinancialService.seedSampleData()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            title="Add sample data for testing"
          >
            Add Sample Data
          </button>
          <button
            onClick={() => FinancialService.createNewInvoice()}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            title="Create a new invoice"
          >
            📄 Add Invoice
          </button>
          <button
            onClick={exportFinancialReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Download size={16} className="mr-2 inline" />
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
            <label className="block text-xs font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => updateSearchParams({ from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => updateSearchParams({ to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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

          {/* Year Selector - Only show when Yearly Reports is selected */}
          {granularity === "YEAR" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Select Year
              </label>
              <select
                value={from.split("-")[0]}
                onChange={(e) => {
                  const selectedYear = e.target.value;
                  const yearStart = new Date(parseInt(selectedYear), 0, 1);
                  const yearEnd = new Date(parseInt(selectedYear), 11, 31);
                  updateSearchParams({
                    from: yearStart.toISOString().split("T")[0],
                    to: yearEnd.toISOString().split("T")[0],
                  });
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {(() => {
                  const years = [];
                  const now = new Date();
                  for (let i = -5; i <= 2; i++) {
                    const year = now.getFullYear() + i;
                    years.push(year);
                  }
                  return years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ));
                })()}
              </select>
            </div>
          )}

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

        {/* Quick Period Presets */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const now = new Date();
              const lastMonth = new Date(
                now.getFullYear(),
                now.getMonth() - 1,
                1
              );
              updateSearchParams({
                from: lastMonth.toISOString().split("T")[0],
                to: now.toISOString().split("T")[0],
              });
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Last Month
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const lastQuarter = new Date(
                now.getFullYear(),
                now.getMonth() - 3,
                1
              );
              updateSearchParams({
                from: lastQuarter.toISOString().split("T")[0],
                to: now.toISOString().split("T")[0],
              });
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Last Quarter
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const lastYear = new Date(now.getFullYear() - 1, 0, 1);
              updateSearchParams({
                from: lastYear.toISOString().split("T")[0],
                to: now.toISOString().split("T")[0],
              });
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Last Year
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const thisYear = new Date(now.getFullYear(), 0, 1);
              updateSearchParams({
                from: thisYear.toISOString().split("T")[0],
                to: now.toISOString().split("T")[0],
              });
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            This Year
          </button>
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
                <tr key={item.period} className="hover:bg-gray-50">
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
                      {formatPeriodLabel(item.period, granularity)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(item.revenue, "USD")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.profit ? formatCurrency(item.profit, "USD") : "N/A"}
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
                      {item.invoiceCount}
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

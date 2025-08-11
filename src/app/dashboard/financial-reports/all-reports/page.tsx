"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Building,
  ArrowRight,
  X,
  ArrowLeft,
} from "lucide-react";
import { Property, PeriodGranularity, PropertyRankItem } from "@/types/float34";
import { getApi } from "@/lib/api";

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

// KPI Card Component
function KPICard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center">
        <div className={`p-2 ${iconBg} rounded-lg`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AllReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const granularity = (searchParams.get("g") as PeriodGranularity) || "MONTH";

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

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const api = getApi();
      const [propertiesData, financialData] = await Promise.all([
        api.listProperties(),
        api.getPropertyFinancials({
          from,
          to,
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
  }, [from, to, granularity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateBack = () => {
    const params = new URLSearchParams({
      from,
      to,
      g: granularity,
    });
    router.push(`/dashboard/financial-reports?${params.toString()}`);
  };

  const exportAllReports = () => {
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
    link.setAttribute(
      "download",
      `all-reports-${granularity.toLowerCase()}-${from}-to-${to}.csv`
    );
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

  const { summary, byProperty, series } = financialData;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={navigateBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Reports
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            All{" "}
            {granularity === "WEEK"
              ? "Weekly"
              : granularity === "YEAR"
              ? "Yearly"
              : "Monthly"}{" "}
            Reports
          </h1>
          <p className="text-gray-600">
            Complete performance overview for all properties
            {from &&
              to &&
              ` from ${new Date(from).toLocaleDateString()} to ${new Date(
                to
              ).toLocaleDateString()}`}
          </p>
        </div>
        <button
          onClick={exportAllReports}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download size={20} />
          Export All Reports
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(summary.revenue)}
          icon={<DollarSign size={24} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
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
          title="Overall Payment Rate"
          value={`${Math.round(summary.invoicesPaidPct || 0)}% paid`}
          subtitle={`${(summary.invoicesPaidPct || 0).toFixed(
            1
          )}% payment rate`}
          icon={<BarChart3 size={24} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* All Properties Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Properties Performance (
            {granularity === "WEEK"
              ? "Weekly"
              : granularity === "YEAR"
              ? "Yearly"
              : "Monthly"}
            )
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
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
              {byProperty.map((property, index) => (
                <tr key={property.propertyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      #{index + 1}
                    </div>
                  </td>
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

      {/* Time Series Data */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {granularity === "WEEK"
              ? "Weekly"
              : granularity === "YEAR"
              ? "Yearly"
              : "Monthly"}{" "}
            Performance Over Time
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {granularity === "WEEK"
                    ? "Week"
                    : granularity === "YEAR"
                    ? "Year"
                    : "Month"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Profit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {series?.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPeriodLabel(
                        item.trend?.[0]?.label || "",
                        granularity
                      )}
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
                    <div className="text-sm text-gray-900">
                      {item.trend?.length || 0} properties
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Insights */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Summary Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Top Performers</h4>
            <div className="space-y-2">
              {byProperty.slice(0, 3).map((property, index) => (
                <div
                  key={property.propertyId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600">
                    #{index + 1} {property.propertyName}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(property.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Performance Metrics
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Average Revenue per Property
                </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(summary.revenue / byProperty.length)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Properties</span>
                <span className="font-medium text-gray-900">
                  {byProperty.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overall Margin</span>
                <span className="font-medium text-gray-900">
                  {summary.marginPct
                    ? `${summary.marginPct.toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

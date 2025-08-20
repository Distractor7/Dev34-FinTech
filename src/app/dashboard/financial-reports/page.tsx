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

export default function FinancialReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Simple state
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

  // Simple date range - default to current month
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear() - 1, 0, 1); // 1 year ago - show all data
    return firstDay.toISOString().split("T")[0];
  });

  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });

  // Debounced dates for API calls
  const debouncedFrom = useDebounce(fromDate, 500);
  const debouncedTo = useDebounce(toDate, 500);

  // Get selected property name for display
  const selectedProperty = properties.find(
    (p) => p.id === searchParams.get("propertyId") || ""
  );

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get properties from PropertyService
      const PropertyService = await import("@/services/propertyService");
      const propertiesData =
        await PropertyService.PropertyService.getProperties();

      // Get invoice data directly from InvoiceService (same as invoices page)
      const InvoiceService = await import("@/services/invoiceService");
      const [invoices, invoiceStats] = await Promise.all([
        InvoiceService.InvoiceService.getInvoices(),
        InvoiceService.InvoiceService.getInvoiceStats(),
      ]);

      setProperties(propertiesData);

      // Transform invoice data to match expected format
      const transformedFinancialData = {
        summary: {
          revenue: invoiceStats.totalAmount,
          expenses: invoiceStats.totalAmount * 0.3, // 30% assumption for now
          profit: invoiceStats.totalAmount * 0.7, // 70% of revenue
          marginPct: 70.0, // Fixed margin for now
          invoicesPaidPct:
            invoiceStats.paidAmount > 0
              ? (invoiceStats.paidAmount / invoiceStats.totalAmount) * 100
              : 0,
        },
        byProperty: propertiesData
          .map((property) => {
            // Calculate property-specific stats from invoices
            const propertyInvoices = invoices.filter(
              (inv) => inv.propertyId === property.id
            );
            const propertyRevenue = propertyInvoices.reduce(
              (sum, inv) => sum + inv.total,
              0
            );
            const propertyPaidInvoices = propertyInvoices.filter(
              (inv) => inv.status === "paid"
            );
            const propertyPaidAmount = propertyPaidInvoices.reduce(
              (sum, inv) => sum + inv.total,
              0
            );

            return {
              propertyId: property.id,
              propertyName: property.name,
              revenue: propertyRevenue,
              profit: propertyRevenue * 0.7, // 70% margin assumption
              marginPct: propertyRevenue > 0 ? 70.0 : 0,
              invoicesPaidPct:
                propertyRevenue > 0
                  ? (propertyPaidAmount / propertyRevenue) * 100
                  : 0,
            };
          })
          .filter((prop) => prop.revenue > 0), // Only show properties with invoices
        series: [], // Empty for now - will implement time series later
      };

      setFinancialData(transformedFinancialData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []); // Remove debouncedFrom, debouncedTo dependencies

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    link.setAttribute(
      "download",
      `financial-report-${fromDate}-to-${toDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigateToAnalytics = (propertyId: string) => {
    const params = new URLSearchParams({
      propertyId,
      from: fromDate,
      to: toDate,
    });
    router.push(`/dashboard/analytics?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
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
            Complete financial overview from all invoices in the system
          </p>
        </div>
        <div className="flex items-center space-x-2">
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

      {/* Simple Filters Bar */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Property
            </label>
            <PropertySelect
              properties={properties}
              value={searchParams.get("propertyId") || ""}
              onChange={(value) => {
                const params = new URLSearchParams(searchParams);
                if (value) {
                  params.set("propertyId", value);
                } else {
                  params.delete("propertyId");
                }
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
          </div>
        </div>

        {/* Simple Summary - No Date Range */}
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          <span>
            Showing data for <span className="font-medium">all invoices</span>{" "}
            in the system
          </span>
        </div>
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
            {searchParams.get("propertyId")
              ? `${selectedProperty?.name} Performance`
              : `All Properties with Invoices`}
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
              Showing aggregate trends across all properties from all invoices
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
        </div>
      )}
    </div>
  );
}

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
import { PropertyService } from "@/services/propertyService";
import { InvoiceService } from "@/services/invoiceService";

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

  // Debounced dates for API calls (not currently used but kept for future)
  const debouncedFrom = useDebounce(fromDate, 500);
  const debouncedTo = useDebounce(toDate, 500);

  // Get selected property name for display
  const selectedProperty = properties.find(
    (p) => p.id === searchParams.get("propertyId")
  );

  // Fetch data
  const fetchData = useCallback(async (selectedPropertyId?: string) => {
    setLoading(true);
    try {
      // Get properties from PropertyService
      const propertiesData = await PropertyService.getProperties({});

      // Get invoice data directly from InvoiceService (same as invoices page)
      const [invoices, invoiceStats] = await Promise.all([
        InvoiceService.getInvoices(),
        InvoiceService.getInvoiceStats(),
      ]);

      console.log("🔍 Debug - Invoices:", invoices);
      console.log("🔍 Debug - Invoice Stats:", invoiceStats);
      console.log("🔍 Debug - Properties:", propertiesData);

      setProperties(propertiesData);

      // Filter invoices by selected property if specified
      const filteredInvoices = selectedPropertyId
        ? invoices.filter((inv) => inv.propertyId === selectedPropertyId)
        : invoices;

      console.log("🔍 Debug - Selected Property ID:", selectedPropertyId);
      console.log("🔍 Debug - Filtered Invoices:", filteredInvoices);
      console.log(
        "🔍 Debug - All Invoices Property IDs:",
        invoices.map((inv) => inv.propertyId)
      );
      console.log(
        "🔍 Debug - All Properties IDs:",
        propertiesData.map((p) => p.id)
      );
      console.log("🔍 Debug - Invoice Count:", invoices.length);
      console.log("🔍 Debug - Properties Count:", propertiesData.length);

      // Calculate summary based on filtered invoices
      const filteredTotalAmount = filteredInvoices.reduce(
        (sum, inv) => sum + inv.total,
        0
      );
      const filteredPaidAmount = filteredInvoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + inv.total, 0);

      // Transform invoice data to match expected format
      const transformedFinancialData = {
        summary: {
          revenue: filteredTotalAmount,
          expenses: filteredTotalAmount * 0.3, // 30% assumption for now
          profit: filteredTotalAmount * 0.7, // 70% of revenue
          marginPct: 70.0, // Fixed margin for now
          invoicesPaidPct:
            filteredTotalAmount > 0
              ? (filteredPaidAmount / filteredTotalAmount) * 100
              : 0,
        },
        byProperty: selectedPropertyId
          ? // If property is selected, show only that property
            (() => {
              const property = propertiesData.find(
                (p) => p.id === selectedPropertyId
              );
              if (!property) return [];

              const propertyInvoices = invoices.filter(
                (inv) => inv.propertyId === selectedPropertyId
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

              return [
                {
                  propertyId: property.id,
                  propertyName: property.name,
                  revenue: propertyRevenue,
                  profit: propertyRevenue * 0.7, // 70% margin assumption
                  marginPct: propertyRevenue > 0 ? 70.0 : 0,
                  invoicesPaidPct:
                    propertyRevenue > 0
                      ? (propertyPaidAmount / propertyRevenue) * 100
                      : 0,
                },
              ];
            })()
          : // Show all properties with invoices
            propertiesData
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
  }, []); // Stable dependency array - no dependencies needed

  // Initial data fetch and refetch when property filter changes
  useEffect(() => {
    const propertyId = searchParams.get("propertyId");
    fetchData(propertyId || undefined);
  }, [searchParams, fetchData]);

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
              onClick={async () => {
                try {
                  console.log("🌱 Seeding properties and invoices...");

                  // First, seed the 3 properties that match the invoice IDs
                  const propertiesToSeed = [
                    {
                      id: "prop_knysna_mall",
                      name: "Knysna Mall",
                      address: {
                        street: "789 Coastal Drive",
                        city: "Knysna",
                        state: "WC",
                        zipCode: "6570",
                        country: "South Africa",
                        fullAddress:
                          "789 Coastal Drive, Knysna, WC 6570, South Africa",
                      },
                      status: "active" as const,
                      propertyType: "Retail",
                      squareFootage: 20000,
                      yearBuilt: 2010,
                      description:
                        "Modern shopping mall in the heart of Knysna with excellent foot traffic",
                      amenities: [
                        "Parking",
                        "Security",
                        "HVAC",
                        "Food Court",
                        "Entertainment",
                      ],
                      contactInfo: {
                        phone: "+27-44-123-4567",
                        email: "manager@knysnamall.co.za",
                        manager: "David Wilson",
                        emergencyContact: "+27-44-999-9999",
                      },
                      financialInfo: {
                        purchasePrice: 3500000,
                        currentValue: 4200000,
                        monthlyRent: 35000,
                        propertyTax: 25000,
                        insurance: 15000,
                        monthlyExpenses: 12000,
                      },
                      location: {
                        latitude: -34.0351,
                        longitude: 23.0465,
                        timezone: "Africa/Johannesburg",
                      },
                      metadata: {
                        tags: [
                          "retail",
                          "mall",
                          "coastal",
                          "modern",
                          "high-traffic",
                        ],
                        features: ["parking", "security", "food-court"],
                        restrictions: ["business-hours-only"],
                      },
                    },
                    {
                      id: "prop_cavendish_center",
                      name: "Cavendish Center",
                      address: {
                        street: "456 Business Avenue",
                        city: "Midtown",
                        state: "CA",
                        zipCode: "90211",
                        country: "USA",
                        fullAddress:
                          "456 Business Avenue, Midtown, CA 90211, USA",
                      },
                      status: "active" as const,
                      propertyType: "Office",
                      squareFootage: 25000,
                      yearBuilt: 2005,
                      description:
                        "Modern office complex with premium amenities and professional atmosphere",
                      amenities: [
                        "Parking",
                        "Security",
                        "HVAC",
                        "Elevator",
                        "Conference Rooms",
                        "Break Room",
                        "Fitness Center",
                      ],
                      contactInfo: {
                        phone: "+1-555-0101",
                        email: "admin@cavendishcenter.com",
                        manager: "Sarah Johnson",
                        emergencyContact: "+1-555-9998",
                      },
                      financialInfo: {
                        purchasePrice: 4000000,
                        currentValue: 4800000,
                        monthlyRent: 40000,
                        propertyTax: 30000,
                        insurance: 18000,
                        monthlyExpenses: 15000,
                      },
                      location: {
                        latitude: 34.0522,
                        longitude: -118.2437,
                        timezone: "America/Los_Angeles",
                      },
                      metadata: {
                        tags: ["office", "modern", "premium", "professional"],
                        features: ["parking", "security", "conference-rooms"],
                        restrictions: ["business-hours-only"],
                      },
                    },
                    {
                      id: "prop_flour_market",
                      name: "The Flour Market",
                      address: {
                        street: "123 Main Street",
                        city: "Downtown",
                        state: "CA",
                        zipCode: "90210",
                        country: "USA",
                        fullAddress: "123 Main Street, Downtown, CA 90210, USA",
                      },
                      status: "active" as const,
                      propertyType: "Retail",
                      squareFootage: 15000,
                      yearBuilt: 1995,
                      description:
                        "Historic retail building in downtown area with excellent foot traffic",
                      amenities: [
                        "Parking",
                        "Security",
                        "HVAC",
                        "Loading Dock",
                        "Storage Space",
                      ],
                      contactInfo: {
                        phone: "+1-555-0100",
                        email: "manager@flourmarket.com",
                        manager: "John Smith",
                        emergencyContact: "+1-555-9999",
                      },
                      financialInfo: {
                        purchasePrice: 2500000,
                        currentValue: 3200000,
                        monthlyRent: 25000,
                        propertyTax: 18000,
                        insurance: 12000,
                        monthlyExpenses: 8000,
                      },
                      location: {
                        latitude: 34.0522,
                        longitude: -118.2437,
                        timezone: "America/Los_Angeles",
                      },
                      metadata: {
                        tags: [
                          "retail",
                          "downtown",
                          "historic",
                          "high-traffic",
                        ],
                        features: ["parking", "security", "storage"],
                        restrictions: ["no-industrial", "business-hours-only"],
                      },
                    },
                  ];

                  // Seed properties first using direct Firestore operations
                  const { db } = await import("@/services/firebaseConfig");
                  const { doc, setDoc, getDoc } = await import(
                    "firebase/firestore"
                  );

                  for (const property of propertiesToSeed) {
                    try {
                      // Check if property already exists
                      const existingDoc = await getDoc(
                        doc(db, "properties", property.id)
                      );
                      if (existingDoc.exists()) {
                        console.log(
                          `ℹ️ Property ${property.name} already exists, skipping`
                        );
                        continue;
                      }

                      const propertyToStore = {
                        ...property,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        createdBy: "system",
                        updatedBy: "system",
                      };

                      await setDoc(
                        doc(db, "properties", property.id),
                        propertyToStore
                      );
                      console.log(`✅ Property created: ${property.name}`);
                    } catch (error) {
                      console.log(
                        `❌ Error creating property ${property.name}:`,
                        error
                      );
                    }
                  }

                  // Now seed service providers that match the invoice provider IDs
                  const providersToSeed = [
                    {
                      id: "prov_parking_plus",
                      name: "Parking Plus Services",
                      service: "Parking Management",
                      description:
                        "Professional parking lot management and security services",
                      contactInfo: {
                        phone: "+1-555-0200",
                        email: "info@parkingplus.com",
                        website: "https://parkingplus.com",
                      },
                      address: {
                        street: "100 Parking Plaza",
                        city: "Downtown",
                        state: "CA",
                        zipCode: "90210",
                        country: "USA",
                      },
                      status: "active" as const,
                      rating: 4.8,
                      specialties: [
                        "Parking Management",
                        "Security",
                        "Maintenance",
                      ],
                      propertyIds: ["prop_knysna_mall", "prop_flour_market"],
                    },
                    {
                      id: "prov_cleanpro_services",
                      name: "CleanPro Services",
                      service: "Cleaning & Sanitization",
                      description:
                        "Professional cleaning and sanitization services for commercial properties",
                      contactInfo: {
                        phone: "+1-555-0300",
                        email: "info@cleanpro.com",
                        website: "https://cleanpro.com",
                      },
                      address: {
                        street: "200 Clean Street",
                        city: "Midtown",
                        state: "CA",
                        zipCode: "90211",
                        country: "USA",
                      },
                      status: "active" as const,
                      rating: 4.9,
                      specialties: [
                        "Deep Cleaning",
                        "Sanitization",
                        "Maintenance",
                      ],
                      propertyIds: ["prop_flour_market"],
                    },
                    {
                      id: "prov_fibernet_solutions",
                      name: "FiberNet Solutions",
                      service: "Internet & Network",
                      description:
                        "High-speed internet and network maintenance services",
                      contactInfo: {
                        phone: "+1-555-0400",
                        email: "info@fibernet.com",
                        website: "https://fibernet.com",
                      },
                      address: {
                        street: "300 Tech Avenue",
                        city: "Downtown",
                        state: "CA",
                        zipCode: "90210",
                        country: "USA",
                      },
                      status: "active" as const,
                      rating: 4.7,
                      specialties: [
                        "Internet Service",
                        "Network Maintenance",
                        "Fiber Optics",
                      ],
                      propertyIds: ["prop_cavendish_center"],
                    },
                  ];

                  // Seed service providers
                  for (const provider of providersToSeed) {
                    try {
                      const existingDoc = await getDoc(
                        doc(db, "serviceProviders", provider.id)
                      );
                      if (existingDoc.exists()) {
                        console.log(
                          `ℹ️ Provider ${provider.name} already exists, skipping`
                        );
                        continue;
                      }

                      const providerToStore = {
                        ...provider,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        createdBy: "system",
                        updatedBy: "system",
                      };

                      await setDoc(
                        doc(db, "serviceProviders", provider.id),
                        providerToStore
                      );
                      console.log(`✅ Provider created: ${provider.name}`);
                    } catch (error) {
                      console.log(
                        `❌ Error creating provider ${provider.name}:`,
                        error
                      );
                    }
                  }

                  // Now seed the invoices that reference these properties and providers
                  await InvoiceService.seedSampleInvoices();
                  console.log("✅ Invoices seeded successfully");

                  console.log("🎉 All data seeded successfully!");
                  console.log("📊 Created:", {
                    properties: propertiesToSeed.length,
                    providers: providersToSeed.length,
                    invoices: "6 sample invoices",
                  });

                  // Refresh the page to show the new data
                  window.location.reload();
                } catch (error) {
                  console.error("❌ Error seeding data:", error);
                }
              }}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🌱 Seed All Data (Properties, Providers, Invoices)
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
            {summary.revenue > 0 ? (
              <>
                Showing data for{" "}
                <span className="font-medium">
                  {searchParams.get("propertyId")
                    ? `${selectedProperty?.name} invoices only`
                    : "all invoices"}
                </span>{" "}
                in the system
              </>
            ) : (
              <>
                No invoices found in the database.{" "}
                <span className="font-medium">Seed data first</span> to see
                financial reports.
              </>
            )}
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

      {/* Empty State - No Invoices */}
      {!loading && byProperty.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Financial Data Available
          </h3>
          <p className="text-gray-600 mb-4">
            There are no invoices in the database yet. To see financial reports:
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>
              • Use the "🌱 Seed All Data" button below to create sample data
            </p>
            <p>• Or manually add invoices through the Invoices page</p>
            <p>
              • Make sure you have properties and service providers set up first
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 max-w-sm mx-auto">
            <button
              onClick={async () => {
                try {
                  console.log("🌱 Seeding properties and invoices...");

                  // First, seed the 3 properties that match the invoice IDs
                  const propertiesToSeed = [
                    {
                      id: "prop_knysna_mall",
                      name: "Knysna Mall",
                      address: {
                        street: "789 Coastal Drive",
                        city: "Knysna",
                        state: "WC",
                        zipCode: "6570",
                        country: "South Africa",
                        fullAddress:
                          "789 Coastal Drive, Knysna, WC 6570, South Africa",
                      },
                      status: "active" as const,
                      propertyType: "Retail",
                      squareFootage: 20000,
                      yearBuilt: 2010,
                      description:
                        "Modern shopping mall in the heart of Knysna with excellent foot traffic",
                      amenities: [
                        "Parking",
                        "Security",
                        "HVAC",
                        "Food Court",
                        "Entertainment",
                      ],
                      contactInfo: {
                        phone: "+27-44-123-4567",
                        email: "manager@knysnamall.co.za",
                        manager: "David Wilson",
                        emergencyContact: "+27-44-999-9999",
                      },
                      financialInfo: {
                        purchasePrice: 3500000,
                        currentValue: 4200000,
                        monthlyRent: 35000,
                        propertyTax: 25000,
                        insurance: 15000,
                        monthlyExpenses: 12000,
                      },
                      location: {
                        latitude: -34.0351,
                        longitude: 23.0465,
                        timezone: "Africa/Johannesburg",
                      },
                      metadata: {
                        tags: [
                          "retail",
                          "mall",
                          "coastal",
                          "modern",
                          "high-traffic",
                        ],
                        features: ["parking", "security", "food-court"],
                        restrictions: ["business-hours-only"],
                      },
                    },
                    {
                      id: "prop_cavendish_center",
                      name: "Cavendish Center",
                      address: {
                        street: "456 Business Avenue",
                        city: "Midtown",
                        state: "CA",
                        zipCode: "90211",
                        country: "USA",
                        fullAddress:
                          "456 Business Avenue, Midtown, CA 90211, USA",
                      },
                      status: "active" as const,
                      propertyType: "Office",
                      squareFootage: 25000,
                      yearBuilt: 2005,
                      description:
                        "Modern office complex with premium amenities and professional atmosphere",
                      amenities: [
                        "Parking",
                        "Security",
                        "HVAC",
                        "Elevator",
                        "Conference Rooms",
                        "Break Room",
                        "Fitness Center",
                      ],
                      contactInfo: {
                        phone: "+1-555-0101",
                        email: "admin@cavendishcenter.com",
                        manager: "Sarah Johnson",
                        emergencyContact: "+1-555-9998",
                      },
                      financialInfo: {
                        purchasePrice: 4000000,
                        currentValue: 4800000,
                        monthlyRent: 40000,
                        propertyTax: 30000,
                        insurance: 18000,
                        monthlyExpenses: 15000,
                      },
                      location: {
                        latitude: 34.0522,
                        longitude: -118.2437,
                        timezone: "America/Los_Angeles",
                      },
                      metadata: {
                        tags: ["office", "modern", "premium", "professional"],
                        features: ["parking", "security", "conference-rooms"],
                        restrictions: ["business-hours-only"],
                      },
                    },
                    {
                      id: "prop_flour_market",
                      name: "The Flour Market",
                      address: {
                        street: "123 Main Street",
                        city: "Downtown",
                        state: "CA",
                        zipCode: "90210",
                        country: "USA",
                        fullAddress: "123 Main Street, Downtown, CA 90210, USA",
                      },
                      status: "active" as const,
                      propertyType: "Retail",
                      squareFootage: 15000,
                      yearBuilt: 1995,
                      description:
                        "Historic retail building in downtown area with excellent foot traffic",
                      amenities: [
                        "Parking",
                        "Security",
                        "HVAC",
                        "Loading Dock",
                        "Storage Space",
                      ],
                      contactInfo: {
                        phone: "+1-555-0100",
                        email: "manager@flourmarket.com",
                        manager: "John Smith",
                        emergencyContact: "+1-555-9999",
                      },
                      financialInfo: {
                        purchasePrice: 2500000,
                        currentValue: 3200000,
                        monthlyRent: 25000,
                        propertyTax: 18000,
                        insurance: 12000,
                        monthlyExpenses: 8000,
                      },
                      location: {
                        latitude: 34.0522,
                        longitude: -118.2437,
                        timezone: "America/Los_Angeles",
                      },
                      metadata: {
                        tags: [
                          "retail",
                          "downtown",
                          "historic",
                          "high-traffic",
                        ],
                        features: ["parking", "security", "storage"],
                        restrictions: ["no-industrial", "business-hours-only"],
                      },
                    },
                  ];

                  // Seed properties first using direct Firestore operations
                  const { db } = await import("@/services/firebaseConfig");
                  const { doc, setDoc, getDoc } = await import(
                    "firebase/firestore"
                  );

                  for (const property of propertiesToSeed) {
                    try {
                      // Check if property already exists
                      const existingDoc = await getDoc(
                        doc(db, "properties", property.id)
                      );
                      if (existingDoc.exists()) {
                        console.log(
                          `ℹ️ Property ${property.name} already exists, skipping`
                        );
                        continue;
                      }

                      const propertyToStore = {
                        ...property,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        createdBy: "system",
                        updatedBy: "system",
                      };

                      await setDoc(
                        doc(db, "properties", property.id),
                        propertyToStore
                      );
                      console.log(`✅ Property created: ${property.name}`);
                    } catch (error) {
                      console.log(
                        `❌ Error creating property ${property.name}:`,
                        error
                      );
                    }
                  }

                  // Now seed service providers that match the invoice provider IDs
                  const providersToSeed = [
                    {
                      id: "prov_parking_plus",
                      name: "Parking Plus Services",
                      service: "Parking Management",
                      description:
                        "Professional parking lot management and security services",
                      contactInfo: {
                        phone: "+1-555-0200",
                        email: "info@parkingplus.com",
                        website: "https://parkingplus.com",
                      },
                      address: {
                        street: "100 Parking Plaza",
                        city: "Downtown",
                        state: "CA",
                        zipCode: "90210",
                        country: "USA",
                      },
                      status: "active" as const,
                      rating: 4.8,
                      specialties: [
                        "Parking Management",
                        "Security",
                        "Maintenance",
                      ],
                      propertyIds: ["prop_knysna_mall", "prop_flour_market"],
                    },
                    {
                      id: "prov_cleanpro_services",
                      name: "CleanPro Services",
                      service: "Cleaning & Sanitization",
                      description:
                        "Professional cleaning and sanitization services for commercial properties",
                      contactInfo: {
                        phone: "+1-555-0300",
                        email: "info@cleanpro.com",
                        website: "https://cleanpro.com",
                      },
                      address: {
                        street: "200 Clean Street",
                        city: "Midtown",
                        state: "CA",
                        zipCode: "90211",
                        country: "USA",
                      },
                      status: "active" as const,
                      rating: 4.9,
                      specialties: [
                        "Deep Cleaning",
                        "Sanitization",
                        "Maintenance",
                      ],
                      propertyIds: ["prop_flour_market"],
                    },
                    {
                      id: "prov_fibernet_solutions",
                      name: "FiberNet Solutions",
                      service: "Internet & Network",
                      description:
                        "High-speed internet and network maintenance services",
                      contactInfo: {
                        phone: "+1-555-0400",
                        email: "info@fibernet.com",
                        website: "https://fibernet.com",
                      },
                      address: {
                        street: "300 Tech Avenue",
                        city: "Downtown",
                        state: "CA",
                        zipCode: "90210",
                        country: "USA",
                      },
                      status: "active" as const,
                      rating: 4.7,
                      specialties: [
                        "Internet Service",
                        "Network Maintenance",
                        "Fiber Optics",
                      ],
                      propertyIds: ["prop_cavendish_center"],
                    },
                  ];

                  // Seed service providers
                  for (const provider of providersToSeed) {
                    try {
                      const existingDoc = await getDoc(
                        doc(db, "serviceProviders", provider.id)
                      );
                      if (existingDoc.exists()) {
                        console.log(
                          `ℹ️ Provider ${provider.name} already exists, skipping`
                        );
                        continue;
                      }

                      const providerToStore = {
                        ...provider,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        createdBy: "system",
                        updatedBy: "system",
                      };

                      await setDoc(
                        doc(db, "serviceProviders", provider.id),
                        providerToStore
                      );
                      console.log(`✅ Provider created: ${provider.name}`);
                    } catch (error) {
                      console.log(
                        `❌ Error creating provider ${provider.name}:`,
                        error
                      );
                    }
                  }

                  // Now seed the invoices that reference these properties and providers
                  await InvoiceService.seedSampleInvoices();
                  console.log("✅ Invoices seeded successfully");

                  console.log("🎉 All data seeded successfully!");
                  console.log("📊 Created:", {
                    properties: propertiesToSeed.length,
                    providers: providersToSeed.length,
                    invoices: "6 sample invoices",
                  });

                  // Refresh the page to show the new data
                  window.location.reload();
                } catch (error) {
                  console.error("❌ Error seeding data:", error);
                }
              }}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🌱 Seed All Data (Properties, Providers, Invoices)
            </button>
            <button
              onClick={() => router.push("/dashboard/invoices")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Invoice
            </button>
          </div>
        </div>
      )}

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

      {/* Debug Section - Remove this after testing */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-gray-100 rounded-lg p-4 mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Debug Info
          </h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Invoices Count: {financialData?.byProperty.length || 0}</div>
            <div>Properties Count: {properties.length}</div>
            <div>
              Selected Property: {searchParams.get("propertyId") || "None"}
            </div>
            <div>Total Revenue: ${financialData?.summary.revenue || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}

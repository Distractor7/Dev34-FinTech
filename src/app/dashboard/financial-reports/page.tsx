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
  Receipt,
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [serviceProviders, setServiceProviders] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
      overdueAmount?: number;
      pendingAmount?: number;
      totalInvoices?: number;
      paidInvoices?: number;
      overdueInvoices?: number;
      serviceProviderCosts?: number;
      operationalCosts?: number;
    };
    byProperty: PropertyRankItem[];
    series?: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

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

  // Helper function to get month name from month number
  const getMonthName = (month: string) => {
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
  };

  // Fetch data
  const fetchData = useCallback(
    async (selectedPropertyId?: string) => {
      setLoading(true);
      try {
        // Get properties from PropertyService
        const propertiesData = await PropertyService.getProperties({});

        // Get service providers
        const { ServiceProviderService } = await import(
          "@/services/serviceProviderService"
        );
        const providersResponse = await ServiceProviderService.getProviders();
        const providersData = providersResponse?.providers || [];

        // Get invoice data directly from InvoiceService (same as invoices page)
        const [invoicesData, invoiceStats] = await Promise.all([
          InvoiceService.getInvoices(),
          InvoiceService.getInvoiceStats(),
        ]);

        console.log("🔍 Debug - Invoices:", invoicesData);
        console.log("🔍 Debug - Invoice Stats:", invoiceStats);
        console.log("🔍 Debug - Properties:", propertiesData);
        console.log("🔍 Debug - Service Providers:", providersData);

        setProperties(propertiesData);
        setInvoices(invoicesData);
        setServiceProviders(providersData);

        // Filter invoices by selected property if specified
        const filteredInvoices = selectedPropertyId
          ? invoicesData.filter((inv) => inv.propertyId === selectedPropertyId)
          : invoicesData;

        // Apply service provider filter
        const providerId = searchParams.get("providerId");
        const providerFilteredInvoices = providerId
          ? filteredInvoices.filter((inv) => inv.providerId === providerId)
          : filteredInvoices;

        // Apply status filter
        const status = searchParams.get("status");
        const statusFilteredInvoices = status
          ? providerFilteredInvoices.filter((inv) => inv.status === status)
          : providerFilteredInvoices;

        // Apply date filtering
        const dateFilteredInvoices = InvoiceService.filterInvoicesByDate(
          statusFilteredInvoices,
          yearFilter !== "all" ? yearFilter : undefined,
          monthFilter !== "all" ? monthFilter : undefined
        );

        console.log("🔍 Debug - Filter Values:", {
          propertyId: selectedPropertyId,
          providerId: providerId,
          status: status,
          yearFilter: yearFilter,
          monthFilter: monthFilter,
        });
        console.log("🔍 Debug - Filter Results:", {
          totalInvoices: invoicesData.length,
          afterPropertyFilter: filteredInvoices.length,
          afterProviderFilter: providerFilteredInvoices.length,
          afterStatusFilter: statusFilteredInvoices.length,
          afterDateFilter: dateFilteredInvoices.length,
        });
        console.log(
          "🔍 Debug - All Invoices Property IDs:",
          invoicesData.map((inv) => inv.propertyId)
        );
        console.log(
          "🔍 Debug - All Properties IDs:",
          propertiesData.map((p) => p.id)
        );
        console.log("🔍 Debug - Invoice Count:", invoicesData.length);
        console.log("🔍 Debug - Properties Count:", propertiesData.length);

        // Calculate financial metrics
        const filteredTotalAmount = dateFilteredInvoices.reduce(
          (sum, inv) => sum + inv.total,
          0
        );
        const filteredPaidAmount = dateFilteredInvoices
          .filter((inv) => inv.status === "paid")
          .reduce((sum, inv) => sum + inv.total, 0);
        const filteredOverdueAmount = dateFilteredInvoices
          .filter((inv) => inv.status === "overdue")
          .reduce((sum, inv) => sum + inv.total, 0);
        const filteredSentAmount = dateFilteredInvoices
          .filter((inv) => inv.status === "sent")
          .reduce((sum, inv) => sum + inv.total, 0);
        const filteredDraftAmount = dateFilteredInvoices
          .filter((inv) => inv.status === "draft")
          .reduce((sum, inv) => sum + inv.total, 0);

        // Calculate expenses and profit with more realistic assumptions
        const estimatedExpenses = filteredTotalAmount * 0.25; // 25% of revenue for operational costs
        const actualProfit = filteredTotalAmount - estimatedExpenses;
        const actualMarginPct =
          filteredTotalAmount > 0
            ? (actualProfit / filteredTotalAmount) * 100
            : 0;

        // Calculate additional expense breakdowns
        const serviceProviderCosts = filteredTotalAmount * 0.15; // 15% for service provider payments
        const operationalCosts = filteredTotalAmount * 0.1; // 10% for other operational expenses

        // Transform invoice data to match expected format
        const transformedFinancialData = {
          summary: {
            revenue: filteredTotalAmount,
            profit: actualProfit,
            marginPct: actualMarginPct,
            invoicesPaidPct:
              filteredTotalAmount > 0
                ? (filteredPaidAmount / filteredTotalAmount) * 100
                : 0,
            overdueAmount: filteredOverdueAmount,
            pendingAmount: filteredSentAmount + filteredDraftAmount,
            totalInvoices: dateFilteredInvoices.length,
            paidInvoices: dateFilteredInvoices.filter(
              (inv) => inv.status === "paid"
            ).length,
            overdueInvoices: dateFilteredInvoices.filter(
              (inv) => inv.status === "overdue"
            ).length,
            expenses: estimatedExpenses,
            serviceProviderCosts: serviceProviderCosts,
            operationalCosts: operationalCosts,
          },
          byProperty: selectedPropertyId
            ? // If property is selected, show only that property
              (() => {
                const property = propertiesData.find(
                  (p) => p.id === selectedPropertyId
                );
                if (!property) return [];

                const propertyInvoices = dateFilteredInvoices.filter(
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
                    invoiceCount: propertyInvoices.length,
                    paidInvoiceCount: propertyPaidInvoices.length,
                  },
                ];
              })()
            : // Show all properties with invoices
              propertiesData
                .map((property) => {
                  // Calculate property-specific stats from invoices
                  const propertyInvoices = dateFilteredInvoices.filter(
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
                    invoiceCount: propertyInvoices.length,
                    paidInvoiceCount: propertyPaidInvoices.length,
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
    },
    [yearFilter, monthFilter, searchParams]
  ); // Added searchParams to dependencies

  // Initial data fetch and refetch when property filter changes
  useEffect(() => {
    const propertyId = searchParams.get("propertyId");
    fetchData(propertyId || undefined);
  }, [searchParams, fetchData]);

  // Refetch data when year/month filters change
  useEffect(() => {
    const propertyId = searchParams.get("propertyId");
    fetchData(propertyId || undefined);
  }, [yearFilter, monthFilter, fetchData]);

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
            Executive financial dashboard with property performance analysis,
            revenue tracking, and payment insights
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
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Service Provider
            </label>
            <select
              value={searchParams.get("providerId") || "all"}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value !== "all") {
                  params.set("providerId", e.target.value);
                } else {
                  params.delete("providerId");
                }
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Service Providers</option>
              {serviceProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
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
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Years</option>
              {InvoiceService.getAvailableYears(invoices).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchParams.get("propertyId") ||
          searchParams.get("providerId") ||
          searchParams.get("status") ||
          yearFilter !== "all" ||
          monthFilter !== "all") && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setYearFilter("all");
                setMonthFilter("all");
                router.push(pathname);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Active Filters Display */}
        {(searchParams.get("propertyId") ||
          searchParams.get("providerId") ||
          searchParams.get("status") ||
          yearFilter !== "all" ||
          monthFilter !== "all") && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-2">
              Active Filters:
            </div>
            <div className="flex flex-wrap gap-2">
              {searchParams.get("propertyId") && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Property:{" "}
                  {properties.find(
                    (p) => p.id === searchParams.get("propertyId")
                  )?.name || searchParams.get("propertyId")}
                </span>
              )}
              {searchParams.get("providerId") && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Provider:{" "}
                  {serviceProviders.find(
                    (p) => p.id === searchParams.get("providerId")
                  )?.name || searchParams.get("providerId")}
                </span>
              )}
              {searchParams.get("status") && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Status: {searchParams.get("status")?.charAt(0).toUpperCase()}
                  {searchParams.get("status")?.slice(1)}
                </span>
              )}
              {yearFilter !== "all" && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Year: {yearFilter}
                </span>
              )}
              {monthFilter !== "all" && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Month: {getMonthName(monthFilter)}
                </span>
              )}
            </div>
          </div>
        )}

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

        {/* Enhanced Data Scope Summary */}
        {summary.revenue > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Data Scope:</span>
                <div className="text-blue-800">
                  {searchParams.get("propertyId")
                    ? "Single Property"
                    : "All Properties"}
                  {searchParams.get("providerId") && " + Service Provider"}
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
                <span className="text-blue-600 font-medium">
                  Total Invoices:
                </span>
                <div className="text-blue-800">
                  {summary.totalInvoices || 0}
                </div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Payment Rate:</span>
                <div className="text-blue-800">
                  {(summary.invoicesPaidPct || 0).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Overdue:</span>
                <div className="text-blue-800">
                  {summary.overdueInvoices || 0} invoices
                </div>
                {summary.expenses && summary.expenses > 0 && (
                  <div>
                    <span className="text-orange-600 font-medium">
                      Expenses:
                    </span>
                    <div className="text-orange-800">
                      {formatCurrency(summary.expenses)} (
                      {((summary.expenses / summary.revenue) * 100).toFixed(1)}%
                      of revenue)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(summary.revenue)}
          subtitle={`${summary.totalInvoices || 0} invoices`}
          icon={<DollarSign size={24} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />

        <KPICard
          title="Net Profit"
          value={formatCurrency(summary.profit || 0)}
          subtitle={`${summary.marginPct?.toFixed(1) || 0}% margin`}
          icon={<TrendingUp size={24} />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />

        <KPICard
          title="Total Expenses"
          value={formatCurrency(summary.expenses || 0)}
          subtitle={`${
            summary.serviceProviderCosts
              ? formatCurrency(summary.serviceProviderCosts)
              : "N/A"
          } provider costs`}
          icon={<Receipt size={24} />}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />

        <KPICard
          title="Payment Rate"
          value={`${Math.round(summary.invoicesPaidPct || 0)}%`}
          subtitle={`${summary.paidInvoices || 0}/${
            summary.totalInvoices || 0
          } invoices paid`}
          icon={<BarChart3 size={24} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />

        <KPICard
          title="Overdue Amount"
          value={formatCurrency(summary.overdueAmount || 0)}
          subtitle={`${summary.overdueInvoices || 0} overdue invoices`}
          icon={<Calendar size={24} />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* Expense Breakdown */}
      {summary.expenses && summary.expenses > 0 && (
        <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
          <h3 className="text-lg font-semibold text-orange-900 mb-4">
            Expense Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {formatCurrency(summary.expenses)}
              </div>
              <div className="text-sm text-orange-800">Total Expenses</div>
              <div className="text-xs text-orange-600 mt-1">
                {summary.revenue > 0
                  ? `${((summary.expenses / summary.revenue) * 100).toFixed(
                      1
                    )}% of revenue`
                  : "N/A"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {formatCurrency(summary.serviceProviderCosts || 0)}
              </div>
              <div className="text-sm text-orange-800">
                Service Provider Costs
              </div>
              <div className="text-xs text-orange-600 mt-1">
                {summary.revenue > 0
                  ? `${(
                      ((summary.serviceProviderCosts || 0) / summary.revenue) *
                      100
                    ).toFixed(1)}% of revenue`
                  : "N/A"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {formatCurrency(summary.operationalCosts || 0)}
              </div>
              <div className="text-sm text-orange-800">Operational Costs</div>
              <div className="text-xs text-orange-600 mt-1">
                {summary.revenue > 0
                  ? `${(
                      ((summary.operationalCosts || 0) / summary.revenue) *
                      100
                    ).toFixed(1)}% of revenue`
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Insights */}
      {summary.revenue > 0 && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Key Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {summary.marginPct?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-blue-800">Profit Margin</div>
              <div className="text-xs text-blue-600 mt-1">
                {summary.marginPct && summary.marginPct > 20
                  ? "Excellent"
                  : summary.marginPct && summary.marginPct > 10
                  ? "Good"
                  : summary.marginPct && summary.marginPct > 0
                  ? "Fair"
                  : "Needs Attention"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {(summary.invoicesPaidPct || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-green-800">Payment Rate</div>
              <div className="text-xs text-green-600 mt-1">
                {summary.invoicesPaidPct && summary.invoicesPaidPct > 80
                  ? "Excellent"
                  : summary.invoicesPaidPct && summary.invoicesPaidPct > 60
                  ? "Good"
                  : summary.invoicesPaidPct && summary.invoicesPaidPct > 40
                  ? "Fair"
                  : "Needs Attention"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {summary.overdueInvoices || 0}
              </div>
              <div className="text-sm text-red-800">Overdue Invoices</div>
              <div className="text-xs text-red-600 mt-1">
                {summary.overdueInvoices === 0
                  ? "All Caught Up"
                  : summary.overdueInvoices && summary.overdueInvoices < 3
                  ? "Manageable"
                  : "Action Required"}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  Invoices
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
                      <div className="font-medium">
                        {property.invoiceCount || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        {property.paidInvoiceCount || 0} paid /{" "}
                        {property.invoiceCount || 0} total
                      </div>
                      {property.invoiceCount && property.invoiceCount > 0 && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                ((property.paidInvoiceCount || 0) /
                                  property.invoiceCount) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      )}
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
            {byProperty.length > 1 && (
              <tfoot className="bg-gray-50">
                <tr className="font-medium">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Building className="text-gray-400 mr-2" size={16} />
                      <span>Total (All Properties)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(
                      byProperty.reduce((sum, p) => sum + p.revenue, 0)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(
                      byProperty.reduce((sum, p) => sum + (p.profit || 0), 0)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      const totalRevenue = byProperty.reduce(
                        (sum, p) => sum + p.revenue,
                        0
                      );
                      const totalProfit = byProperty.reduce(
                        (sum, p) => sum + (p.profit || 0),
                        0
                      );
                      return totalRevenue > 0
                        ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%`
                        : "N/A";
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-medium">
                      {byProperty.reduce(
                        (sum, p) => sum + (p.invoiceCount || 0),
                        0
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {byProperty.reduce(
                        (sum, p) => sum + (p.paidInvoiceCount || 0),
                        0
                      )}{" "}
                      paid /{" "}
                      {byProperty.reduce(
                        (sum, p) => sum + (p.invoiceCount || 0),
                        0
                      )}{" "}
                      total
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      const totalInvoices = byProperty.reduce(
                        (sum, p) => sum + (p.invoiceCount || 0),
                        0
                      );
                      const totalPaid = byProperty.reduce(
                        (sum, p) => sum + (p.paidInvoiceCount || 0),
                        0
                      );
                      return totalInvoices > 0
                        ? `${((totalPaid / totalInvoices) * 100).toFixed(1)}%`
                        : "N/A";
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {/* Empty cell for actions */}
                  </td>
                </tr>
              </tfoot>
            )}
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
    </div>
  );
}

import { Float34Api } from "./index";
import {
  Provider,
  Property,
  PeriodGranularity,
  PropertyFinancialAggregate,
  PropertyRankItem,
} from "@/types/float34";
import {
  properties,
  providers,
  mockFinancialData,
  mockWeeklyData,
  mockYearlyData,
  mockServiceProviderFinancialData,
  mockServiceProviderWeeklyData,
  mockServiceProviderYearlyData,
} from "@/mocks/fixtures";

// Simulate network delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to generate mock financial data
function buildMockPropertyFinancials({
  propertyId,
  from,
  to,
  granularity,
}: {
  propertyId?: string;
  from: string;
  to: string;
  granularity: PeriodGranularity;
}) {
  const activeProperties = properties.filter((p) => p.status === "active");

  // Calculate summary across all properties
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalProfit = 0;
  let totalInvoicesPaid = 0;
  let totalInvoices = 0;

  const byProperty: PropertyRankItem[] = [];
  const series: PropertyFinancialAggregate[] = [];

  // Get data based on granularity
  let dataSource: any;
  let periods: string[];

  switch (granularity) {
    case "WEEK":
      dataSource = mockWeeklyData;
      periods = [
        "2024-W04",
        "2024-W03",
        "2024-W02",
        "2024-W01",
        "2023-W52",
        "2023-W51",
        "2023-W50",
        "2023-W49",
        "2023-W48",
        "2023-W47",
        "2023-W46",
        "2023-W45",
      ] as const;
      break;
    case "MONTH":
      dataSource = mockFinancialData;
      periods = [
        "2024-01",
        "2023-12",
        "2023-11",
        "2023-10",
        "2023-09",
      ] as const;
      break;
    case "YEAR":
      dataSource = mockYearlyData;
      periods = ["2024", "2023", "2022"] as const;
      break;
  }

  if (propertyId) {
    // Single property view
    const property = activeProperties.find((p) => p.id === propertyId);
    if (!property) {
      return {
        summary: { revenue: 0, invoicesPaidPct: 0 },
        byProperty: [],
        series: [],
      };
    }

    // Use the selected period (from parameter) or default to first period
    const selectedPeriod = from || periods[0];
    const currentPeriodData =
      dataSource[selectedPeriod as keyof typeof dataSource]?.[
        propertyId as keyof (typeof dataSource)[typeof selectedPeriod]
      ];

    // Generate trend data for single property (all periods for historical view)
    const trend = periods
      .map((period) => {
        const periodData =
          dataSource[period]?.[
            propertyId as keyof (typeof dataSource)[typeof period]
          ];
        if (periodData) {
          // Only add to totals for the selected period, not all periods
          if (period === selectedPeriod) {
            totalRevenue += periodData.revenue;
            totalExpenses += periodData.expenses || 0;
            totalProfit += periodData.profit || 0;
            totalInvoicesPaid += periodData.invoices.paid;
            totalInvoices += periodData.invoices.total;
          }

          return {
            label: period,
            revenue: periodData.revenue,
            profit: periodData.profit,
          };
        }
        return { label: period, revenue: 0, profit: 0 };
      })
      .filter((t) => t.revenue > 0);

    series.push({
      propertyId: property.id,
      propertyName: property.name,
      periodFrom: from,
      periodTo: to,
      granularity,
      currency: "USD",
      revenue: currentPeriodData?.revenue || 0,
      expenses: currentPeriodData?.expenses,
      profit: currentPeriodData?.profit,
      marginPct: currentPeriodData?.marginPct,
      invoices: currentPeriodData?.invoices || { paid: 0, total: 0 },
      revenueDeltaPct: currentPeriodData?.revenueDeltaPct,
      profitDeltaPct: currentPeriodData?.profitDeltaPct,
      trend,
    });

    byProperty.push({
      propertyId: property.id,
      propertyName: property.name,
      revenue: currentPeriodData?.revenue || 0,
      profit: currentPeriodData?.profit,
      marginPct: currentPeriodData?.marginPct,
      invoicesPaidPct: currentPeriodData
        ? (currentPeriodData.invoices.paid / currentPeriodData.invoices.total) *
          100
        : 0,
    });
  } else {
    // All properties view
    const selectedPeriod = from || periods[0];

    activeProperties.forEach((property) => {
      const currentPeriodData =
        dataSource[selectedPeriod as keyof typeof dataSource]?.[
          property.id as keyof (typeof dataSource)[typeof selectedPeriod]
        ];
      if (currentPeriodData) {
        totalRevenue += currentPeriodData.revenue;
        totalExpenses += currentPeriodData.expenses || 0;
        totalProfit += currentPeriodData.profit || 0;
        totalInvoicesPaid += currentPeriodData.invoices.paid;
        totalInvoices += currentPeriodData.invoices.total;

        byProperty.push({
          propertyId: property.id,
          propertyName: property.name,
          revenue: currentPeriodData.revenue,
          profit: currentPeriodData.profit,
          marginPct: currentPeriodData.marginPct,
          invoicesPaidPct:
            (currentPeriodData.invoices.paid /
              currentPeriodData.invoices.total) *
            100,
        });

        // Generate trend for each property
        const trend = periods
          .map((period) => {
            const data =
              dataSource[period]?.[
                property.id as keyof (typeof dataSource)[typeof period]
              ];
            return {
              label: period,
              revenue: data?.revenue || 0,
              period,
            };
          })
          .filter((t) => t.revenue > 0);

        series.push({
          propertyId: property.id,
          propertyName: property.name,
          periodFrom: from,
          periodTo: to,
          granularity,
          currency: "USD",
          revenue: currentPeriodData.revenue,
          expenses: currentPeriodData.expenses,
          profit: currentPeriodData.profit,
          marginPct: currentPeriodData.marginPct,
          invoices: currentPeriodData.invoices,
          revenueDeltaPct: currentPeriodData.revenueDeltaPct,
          profitDeltaPct: currentPeriodData.profitDeltaPct,
          trend,
        });
      }
    });

    // Sort by revenue (highest first)
    byProperty.sort((a, b) => b.revenue - a.revenue);

    // Add aggregated trend data for all properties view
    const aggregatedTrend = periods
      .map((period) => {
        let periodTotalRevenue = 0;
        let periodTotalExpenses = 0;
        let periodTotalProfit = 0;
        let periodTotalInvoicesPaid = 0;
        let periodTotalInvoices = 0;

        activeProperties.forEach((property) => {
          const periodData =
            dataSource[period]?.[
              property.id as keyof (typeof dataSource)[typeof period]
            ];
          if (periodData) {
            periodTotalRevenue += periodData.revenue;
            periodTotalExpenses += periodData.expenses || 0;
            periodTotalProfit += periodData.profit || 0;
            periodTotalInvoicesPaid += periodData.invoices.paid;
            periodTotalInvoices += periodData.invoices.total;
          }
        });

        return {
          label: period,
          revenue: periodTotalRevenue,
          expenses: periodTotalExpenses,
          profit: periodTotalProfit,
          invoices: {
            paid: periodTotalInvoicesPaid,
            total: periodTotalInvoices,
          },
        };
      })
      .filter((t) => t.revenue > 0);

    // Add aggregated series item for all properties
    series.push({
      propertyId: "all",
      propertyName: "All Properties",
      periodFrom: from,
      periodTo: to,
      granularity,
      currency: "USD",
      revenue: totalRevenue,
      expenses: totalExpenses > 0 ? totalExpenses : undefined,
      profit: totalProfit > 0 ? totalProfit : undefined,
      marginPct:
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : undefined,
      invoices: {
        paid: totalInvoicesPaid,
        total: totalInvoices,
      },
      revenueDeltaPct: undefined, // Calculate this if needed
      profitDeltaPct: undefined, // Calculate this if needed
      trend: aggregatedTrend,
    });
  }

  return {
    summary: {
      revenue: totalRevenue,
      expenses: totalExpenses > 0 ? totalExpenses : undefined,
      profit: totalProfit > 0 ? totalProfit : undefined,
      marginPct:
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : undefined,
      invoicesPaidPct:
        totalInvoices > 0 ? (totalInvoicesPaid / totalInvoices) * 100 : 0,
    },
    byProperty,
    series,
  };
}

// Helper function to generate mock service provider financial data
function buildMockServiceProviderFinancials({
  providerId,
  from,
  to,
  granularity,
}: {
  providerId?: string;
  from: string;
  to: string;
  granularity: PeriodGranularity;
}) {
  const activeProviders = providers.filter((p) => p.status === "active");

  // Calculate summary across all providers
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalProfit = 0;
  let totalInvoicesPaid = 0;
  let totalInvoices = 0;

  const byProvider: any[] = [];
  const series: any[] = [];

  // Get data based on granularity
  let dataSource: any;
  let periods: string[];

  switch (granularity) {
    case "WEEK":
      dataSource = mockServiceProviderWeeklyData;
      periods = [
        "2024-W04",
        "2024-W03",
        "2024-W02",
        "2024-W01",
        "2023-W52",
        "2023-W51",
        "2023-W50",
        "2023-W49",
        "2023-W48",
        "2023-W47",
        "2023-W46",
        "2023-W45",
      ] as const;
      break;
    case "MONTH":
      dataSource = mockServiceProviderFinancialData;
      periods = [
        "2024-01",
        "2023-12",
        "2023-11",
        "2023-10",
        "2023-09",
      ] as const;
      break;
    case "YEAR":
      dataSource = mockServiceProviderYearlyData;
      periods = ["2024", "2023", "2022"] as const;
      break;
  }

  if (providerId) {
    // Single provider view
    const provider = activeProviders.find((p) => p.id === providerId);
    if (!provider) {
      return {
        summary: { revenue: 0, invoicesPaidPct: 0 },
        byProvider: [],
        series: [],
      };
    }

    // Use the selected period (from parameter) or default to first period
    const selectedPeriod = from || periods[0];
    const currentPeriodData =
      dataSource[selectedPeriod as keyof typeof dataSource]?.[
        providerId as keyof (typeof dataSource)[typeof selectedPeriod]
      ];

    // Generate trend data for single provider (all periods for historical view)
    const trend = periods
      .map((period) => {
        const periodData =
          dataSource[period]?.[
            providerId as keyof (typeof dataSource)[typeof period]
          ];
        if (periodData) {
          // Only add to totals for the selected period, not all periods
          if (period === selectedPeriod) {
            totalRevenue += periodData.revenue;
            totalExpenses += periodData.expenses || 0;
            totalProfit += periodData.profit || 0;
            totalInvoicesPaid += periodData.invoices.paid;
            totalInvoices += periodData.invoices.total;
          }

          return {
            label: period,
            revenue: periodData.revenue,
            profit: periodData.profit,
          };
        }
        return { label: period, revenue: 0, profit: 0 };
      })
      .filter((t) => t.revenue > 0);

    series.push({
      providerId: provider.id,
      providerName: provider.name,
      periodFrom: from,
      periodTo: to,
      granularity,
      currency: "USD",
      revenue: currentPeriodData?.revenue || 0,
      expenses: currentPeriodData?.expenses,
      profit: currentPeriodData?.profit,
      marginPct: currentPeriodData?.marginPct,
      invoices: currentPeriodData?.invoices || { paid: 0, total: 0 },
      revenueDeltaPct: currentPeriodData?.revenueDeltaPct,
      profitDeltaPct: currentPeriodData?.profitDeltaPct,
      trend,
    });

    byProvider.push({
      providerId: provider.id,
      providerName: provider.name,
      revenue: currentPeriodData?.revenue || 0,
      profit: currentPeriodData?.profit,
      marginPct: currentPeriodData?.marginPct,
      invoicesPaidPct: currentPeriodData
        ? (currentPeriodData.invoices.paid / currentPeriodData.invoices.total) *
          100
        : 0,
    });
  } else {
    // All providers view
    const selectedPeriod = from || periods[0];

    activeProviders.forEach((provider) => {
      const currentPeriodData =
        dataSource[selectedPeriod as keyof typeof dataSource]?.[
          provider.id as keyof (typeof dataSource)[typeof selectedPeriod]
        ];
      if (currentPeriodData) {
        totalRevenue += currentPeriodData.revenue;
        totalExpenses += currentPeriodData.expenses || 0;
        totalProfit += currentPeriodData.profit || 0;
        totalInvoicesPaid += currentPeriodData.invoices.paid;
        totalInvoices += currentPeriodData.invoices.total;

        byProvider.push({
          providerId: provider.id,
          providerName: provider.name,
          revenue: currentPeriodData.revenue,
          profit: currentPeriodData.profit,
          marginPct: currentPeriodData.marginPct,
          invoicesPaidPct:
            (currentPeriodData.invoices.paid /
              currentPeriodData.invoices.total) *
            100,
        });

        // Generate trend for each provider
        const trend = periods
          .map((period) => {
            const data =
              dataSource[period]?.[
                provider.id as keyof (typeof dataSource)[typeof period]
              ];
            return {
              label: period,
              revenue: data?.revenue || 0,
              period,
            };
          })
          .filter((t) => t.revenue > 0);

        series.push({
          providerId: provider.id,
          providerName: provider.name,
          periodFrom: from,
          periodTo: to,
          granularity,
          currency: "USD",
          revenue: currentPeriodData.revenue,
          expenses: currentPeriodData.expenses,
          profit: currentPeriodData.profit,
          marginPct: currentPeriodData.marginPct,
          invoices: currentPeriodData.invoices,
          revenueDeltaPct: currentPeriodData.revenueDeltaPct,
          profitDeltaPct: currentPeriodData.profitDeltaPct,
          trend,
        });
      }
    });

    // Sort by revenue (highest first)
    byProvider.sort((a, b) => b.revenue - a.revenue);

    // Add aggregated trend data for all providers view
    const aggregatedTrend = periods
      .map((period) => {
        let periodTotalRevenue = 0;
        let periodTotalExpenses = 0;
        let periodTotalProfit = 0;
        let periodTotalInvoicesPaid = 0;
        let periodTotalInvoices = 0;

        activeProviders.forEach((provider) => {
          const periodData =
            dataSource[period]?.[
              provider.id as keyof (typeof dataSource)[typeof period]
            ];
          if (periodData) {
            periodTotalRevenue += periodData.revenue;
            periodTotalExpenses += periodData.expenses || 0;
            periodTotalProfit += periodData.profit || 0;
            periodTotalInvoicesPaid += periodData.invoices.paid;
            periodTotalInvoices += periodData.invoices.total;
          }
        });

        return {
          label: period,
          revenue: periodTotalRevenue,
          expenses: periodTotalExpenses,
          profit: periodTotalProfit,
          invoices: {
            paid: periodTotalInvoicesPaid,
            total: periodTotalInvoices,
          },
        };
      })
      .filter((t) => t.revenue > 0);

    // Add aggregated series item for all providers
    series.push({
      providerId: "all",
      providerName: "All Service Providers",
      periodFrom: from,
      periodTo: to,
      granularity,
      currency: "USD",
      revenue: totalRevenue,
      expenses: totalExpenses > 0 ? totalExpenses : undefined,
      profit: totalProfit > 0 ? totalProfit : undefined,
      marginPct:
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : undefined,
      invoices: {
        paid: totalInvoicesPaid,
        total: totalInvoices,
      },
      revenueDeltaPct: undefined,
      profitDeltaPct: undefined,
      trend: aggregatedTrend,
    });
  }

  return {
    summary: {
      revenue: totalRevenue,
      expenses: totalExpenses > 0 ? totalExpenses : undefined,
      profit: totalProfit > 0 ? totalProfit : undefined,
      marginPct:
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : undefined,
      invoicesPaidPct:
        totalInvoices > 0 ? (totalInvoicesPaid / totalInvoices) * 100 : 0,
    },
    byProvider,
    series,
  };
}

// Helper function to generate combined financial data for property + service provider
function buildMockCombinedFinancials({
  propertyId,
  providerId,
  from,
  to,
  granularity,
}: {
  propertyId?: string;
  providerId?: string;
  from: string;
  to: string;
  granularity: PeriodGranularity;
}) {
  const activeProperties = properties.filter((p) => p.status === "active");
  const activeProviders = providers.filter((p) => p.status === "active");

  // Get data based on granularity
  let dataSource: any;
  let periods: string[];

  switch (granularity) {
    case "WEEK":
      dataSource = mockWeeklyData;
      periods = [
        "2024-W04",
        "2024-W03",
        "2024-W02",
        "2024-W01",
        "2023-W52",
        "2023-W51",
        "2023-W50",
        "2023-W49",
        "2023-W48",
        "2023-W47",
        "2023-W46",
        "2023-W45",
      ] as const;
      break;
    case "MONTH":
      dataSource = mockFinancialData;
      periods = [
        "2024-01",
        "2023-12",
        "2023-11",
        "2023-10",
        "2023-09",
      ] as const;
      break;
    case "YEAR":
      dataSource = mockYearlyData;
      periods = ["2024", "2023", "2022"] as const;
      break;
  }

  const selectedPeriod = from || periods[0];
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalProfit = 0;
  let totalInvoicesPaid = 0;
  let totalInvoices = 0;

  const byProperty: PropertyRankItem[] = [];
  const byProvider: any[] = [];
  const series: any[] = [];
  const combinedData: any[] = [];

  if (propertyId && providerId) {
    // Specific property + specific provider combination
    const property = activeProperties.find((p) => p.id === propertyId);
    const provider = activeProviders.find((p) => p.id === providerId);

    if (property && provider && provider.propertyIds.includes(propertyId)) {
      // Get the specific data for this property-provider combination
      const currentPeriodData = dataSource[selectedPeriod]?.[propertyId];

      if (currentPeriodData) {
        totalRevenue = currentPeriodData.revenue;
        totalExpenses = currentPeriodData.expenses || 0;
        totalProfit = currentPeriodData.profit || 0;
        totalInvoicesPaid = currentPeriodData.invoices.paid;
        totalInvoices = currentPeriodData.invoices.total;

        // Add to combined data
        combinedData.push({
          propertyName: property.name,
          providerName: provider.name,
          revenue: currentPeriodData.revenue,
          profit: currentPeriodData.profit,
          marginPct: currentPeriodData.marginPct,
          invoicesPaidPct:
            (currentPeriodData.invoices.paid /
              currentPeriodData.invoices.total) *
            100,
        });

        // Generate trend data for all periods to show historical performance
        const trend = periods
          .map((period) => {
            const periodData = dataSource[period]?.[propertyId];
            if (periodData) {
              return {
                label: period,
                revenue: periodData.revenue,
                profit: periodData.profit,
              };
            }
            return { label: period, revenue: 0, profit: 0 };
          })
          .filter((t) => t.revenue > 0);

        series.push({
          propertyId: property.id,
          propertyName: property.name,
          providerId: provider.id,
          providerName: provider.name,
          periodFrom: from,
          periodTo: to,
          granularity,
          currency: "USD",
          revenue: currentPeriodData.revenue,
          expenses: currentPeriodData.expenses,
          profit: currentPeriodData.profit,
          marginPct: currentPeriodData.marginPct,
          invoices: currentPeriodData.invoices,
          revenueDeltaPct: currentPeriodData.revenueDeltaPct,
          profitDeltaPct: currentPeriodData.profitDeltaPct,
          trend,
        });

        // Also add an aggregated item for chart compatibility
        series.push({
          propertyId: "combined",
          propertyName: `${property.name} + ${provider.name}`,
          periodFrom: from,
          periodTo: to,
          granularity,
          currency: "USD",
          revenue: currentPeriodData.revenue,
          expenses: currentPeriodData.expenses,
          profit: currentPeriodData.profit,
          marginPct: currentPeriodData.marginPct,
          invoices: currentPeriodData.invoices,
          revenueDeltaPct: currentPeriodData.revenueDeltaPct,
          profitDeltaPct: currentPeriodData.profitDeltaPct,
          trend,
        });
      }
    }
  } else if (propertyId) {
    // Only property specified - get all providers for that property
    const property = activeProperties.find((p) => p.id === propertyId);
    if (property) {
      const propertyProviders = activeProviders.filter((p) =>
        p.propertyIds.includes(propertyId)
      );

      propertyProviders.forEach((provider) => {
        const currentPeriodData = dataSource[selectedPeriod]?.[propertyId];
        if (currentPeriodData) {
          totalRevenue += currentPeriodData.revenue;
          totalExpenses += currentPeriodData.expenses || 0;
          totalProfit += currentPeriodData.profit || 0;
          totalInvoicesPaid += currentPeriodData.invoices.paid;
          totalInvoices += currentPeriodData.invoices.total;

          combinedData.push({
            propertyName: property.name,
            providerName: provider.name,
            revenue: currentPeriodData.revenue,
            profit: currentPeriodData.profit,
            marginPct: currentPeriodData.marginPct,
            invoicesPaidPct:
              (currentPeriodData.invoices.paid /
                currentPeriodData.invoices.total) *
              100,
          });
        }
      });

      // Generate aggregated trend data for the property
      const aggregatedTrend = periods
        .map((period) => {
          const periodData = dataSource[period]?.[propertyId];
          if (periodData) {
            return {
              label: period,
              revenue: periodData.revenue,
              profit: periodData.profit,
            };
          }
          return { label: period, revenue: 0, profit: 0 };
        })
        .filter((t) => t.revenue > 0);

      // Add aggregated series item for the property
      series.push({
        propertyId: property.id,
        propertyName: property.name,
        periodFrom: from,
        periodTo: to,
        granularity,
        currency: "USD",
        revenue: totalRevenue,
        expenses: totalExpenses > 0 ? totalExpenses : undefined,
        profit: totalProfit > 0 ? totalProfit : undefined,
        marginPct:
          totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : undefined,
        invoices: {
          paid: totalInvoicesPaid,
          total: totalInvoices,
        },
        revenueDeltaPct: undefined,
        profitDeltaPct: undefined,
        trend: aggregatedTrend,
      });
    }
  } else if (providerId) {
    // Only provider specified - get all properties for that provider
    const provider = activeProviders.find((p) => p.id === providerId);
    if (provider) {
      provider.propertyIds.forEach((propId) => {
        const property = activeProperties.find((p) => p.id === propId);
        if (property) {
          const currentPeriodData = dataSource[selectedPeriod]?.[propId];
          if (currentPeriodData) {
            totalRevenue += currentPeriodData.revenue;
            totalExpenses += currentPeriodData.expenses || 0;
            totalProfit += currentPeriodData.profit || 0;
            totalInvoicesPaid += currentPeriodData.invoices.paid;
            totalInvoices += currentPeriodData.invoices.total;

            combinedData.push({
              propertyName: property.name,
              providerName: provider.name,
              revenue: currentPeriodData.revenue,
              profit: currentPeriodData.profit,
              marginPct: currentPeriodData.marginPct,
              invoicesPaidPct:
                (currentPeriodData.invoices.paid /
                  currentPeriodData.invoices.total) *
                100,
            });
          }
        }
      });

      // Generate aggregated trend data for the provider across all properties
      const aggregatedTrend = periods
        .map((period) => {
          let periodTotalRevenue = 0;
          let periodTotalProfit = 0;

          provider.propertyIds.forEach((propId) => {
            const periodData = dataSource[period]?.[propId];
            if (periodData) {
              periodTotalRevenue += periodData.revenue;
              periodTotalProfit += periodData.profit || 0;
            }
          });

          return {
            label: period,
            revenue: periodTotalRevenue,
            profit: periodTotalProfit,
          };
        })
        .filter((t) => t.revenue > 0);

      // Add aggregated series item for the provider
      series.push({
        providerId: provider.id,
        providerName: provider.name,
        periodFrom: from,
        periodTo: to,
        granularity,
        currency: "USD",
        revenue: totalRevenue,
        expenses: totalExpenses > 0 ? totalExpenses : undefined,
        profit: totalProfit > 0 ? totalProfit : undefined,
        marginPct:
          totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : undefined,
        invoices: {
          paid: totalInvoicesPaid,
          total: totalInvoices,
        },
        revenueDeltaPct: undefined,
        profitDeltaPct: undefined,
        trend: aggregatedTrend,
      });
    }
  } else {
    // No filters - get all data (existing logic)
    const existingData = buildMockPropertyFinancials({
      propertyId,
      from,
      to,
      granularity,
    });
    return {
      ...existingData,
      byProvider: [],
      combinedData: [],
    };
  }

  // Build property and provider rankings
  if (propertyId) {
    byProperty.push({
      propertyId: propertyId,
      propertyName:
        activeProperties.find((p) => p.id === propertyId)?.name || "",
      revenue: totalRevenue,
      profit: totalProfit,
      marginPct:
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : undefined,
      invoicesPaidPct:
        totalInvoices > 0 ? (totalInvoicesPaid / totalInvoices) * 100 : 0,
    });
  }

  if (providerId) {
    byProvider.push({
      providerId: providerId,
      providerName:
        activeProviders.find((p) => p.id === providerId)?.name || "",
      revenue: totalRevenue,
      profit: totalProfit,
      marginPct:
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : undefined,
      invoicesPaidPct:
        totalInvoices > 0 ? (totalInvoicesPaid / totalInvoices) * 100 : 0,
    });
  }

  return {
    summary: {
      revenue: totalRevenue,
      expenses: totalExpenses > 0 ? totalExpenses : undefined,
      profit: totalProfit > 0 ? totalProfit : undefined,
      marginPct:
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : undefined,
      invoicesPaidPct:
        totalInvoices > 0 ? (totalInvoicesPaid / totalInvoices) * 100 : 0,
    },
    byProperty,
    byProvider,
    series,
    combinedData,
  };
}

export class MockApi implements Float34Api {
  async listProperties(): Promise<Property[]> {
    await sleep(100);
    return properties;
  }

  async listProviders(params?: {
    q?: string;
    propertyId?: string;
  }): Promise<Provider[]> {
    let items = providers;

    if (params?.propertyId) {
      items = items.filter((p) => p.propertyIds.includes(params.propertyId!));
    }

    if (params?.q) {
      const q = params.q.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.service.toLowerCase().includes(q)
      );
    }

    await sleep(150);
    return items;
  }

  async getPropertyFinancials(params: {
    propertyId?: string;
    from: string;
    to: string;
    granularity: PeriodGranularity;
  }): Promise<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    };
    byProperty: PropertyRankItem[];
    series?: PropertyFinancialAggregate[];
  }> {
    const data = buildMockPropertyFinancials(params);
    await sleep(150);
    return data;
  }

  async getServiceProviderFinancials(params: {
    providerId?: string;
    from: string;
    to: string;
    granularity: PeriodGranularity;
  }): Promise<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    };
    byProvider: any[];
    series?: any[];
  }> {
    const data = buildMockServiceProviderFinancials(params);
    await sleep(150);
    return data;
  }

  async getCombinedFinancials(params: {
    propertyId?: string;
    providerId?: string;
    from: string;
    to: string;
    granularity: PeriodGranularity;
  }): Promise<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    };
    byProperty: PropertyRankItem[];
    byProvider: any[];
    series?: any[];
    combinedData?: {
      propertyName: string;
      providerName: string;
      revenue: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    }[];
  }> {
    const data = buildMockCombinedFinancials(params);
    await sleep(150);
    return data;
  }
}

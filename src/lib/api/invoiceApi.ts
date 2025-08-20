import { Float34Api, PeriodGranularity } from "@/types/float34";
import { InvoiceService } from "@/services/invoiceService";
import { PropertyService } from "@/services/propertyService";
import { ServiceProviderService } from "@/services/serviceProviderService";
import { Invoice } from "@/types/float34";

export class InvoiceApi implements Float34Api {
  /**
   * List all service providers with optional filtering
   */
  async listProviders(params?: {
    q?: string;
    propertyId?: string;
  }): Promise<any[]> {
    try {
      const providersResponse = await ServiceProviderService.getProviders();
      const providers = providersResponse?.providers || []; // Extract the providers array with fallback

      // Apply search filter if provided
      if (params?.q) {
        const searchTerm = params.q.toLowerCase();
        return providers.filter(
          (provider) =>
            provider.name.toLowerCase().includes(searchTerm) ||
            provider.service.toLowerCase().includes(searchTerm)
        );
      }

      // Apply property filter if provided
      if (params?.propertyId) {
        return providers.filter((provider) =>
          provider.propertyIds?.includes(params.propertyId!)
        );
      }

      return providers;
    } catch (error) {
      console.error("Error fetching providers:", error);
      return [];
    }
  }

  /**
   * List all properties
   */
  async listProperties(): Promise<any[]> {
    try {
      return await PropertyService.getProperties();
    } catch (error) {
      console.error("Error fetching properties:", error);
      return [];
    }
  }

  /**
   * Get financial data for properties based on invoices
   */
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
    byProperty: any[];
    series?: any[];
  }> {
    try {
      const { propertyId, from, to, granularity } = params;

      // Get all invoices
      const invoices = await InvoiceService.getInvoices();

      // Filter invoices by date range if specified
      let filteredInvoices = invoices;
      if (from && to && from.trim() !== "" && to.trim() !== "") {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        filteredInvoices = invoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.issueDate);
          return invoiceDate >= fromDate && invoiceDate <= toDate;
        });
      }
      // If no date filter, use all invoices

      // Filter by property if specified
      if (propertyId) {
        filteredInvoices = filteredInvoices.filter(
          (invoice) => invoice.propertyId === propertyId
        );
      }

      // Get properties for reference
      const properties = (await PropertyService.getProperties()) || [];

      // Calculate summary
      const totalRevenue = filteredInvoices.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      );
      const totalExpenses = totalRevenue * 0.3; // 30% assumption for now
      const totalProfit = totalRevenue * 0.7; // 70% assumption for now
      const paidInvoices = filteredInvoices.filter(
        (invoice) => invoice.status === "paid"
      );
      const totalPaidAmount = paidInvoices.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      );

      // Calculate by property
      const byProperty = properties
        .map((property) => {
          const propertyInvoices = filteredInvoices.filter(
            (invoice) => invoice.propertyId === property.id
          );

          if (propertyInvoices.length === 0) return null;

          const propertyRevenue = propertyInvoices.reduce(
            (sum, invoice) => sum + invoice.total,
            0
          );
          const propertyPaidInvoices = propertyInvoices.filter(
            (invoice) => invoice.status === "paid"
          );
          const propertyPaidAmount = propertyPaidInvoices.reduce(
            (sum, invoice) => sum + invoice.total,
            0
          );

          return {
            propertyId: property.id,
            propertyName: property.name,
            revenue: propertyRevenue,
            profit: propertyRevenue * 0.7,
            marginPct: 70.0,
            invoicesPaidPct:
              propertyRevenue > 0
                ? (propertyPaidAmount / propertyRevenue) * 100
                : 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b?.revenue || 0) - (a?.revenue || 0)); // Sort by revenue descending

      // Generate time series data based on granularity
      const series = this.generateTimeSeriesData(
        filteredInvoices,
        granularity,
        properties
      );

      return {
        summary: {
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalProfit,
          marginPct: 70.0,
          invoicesPaidPct:
            totalRevenue > 0 ? (totalPaidAmount / totalRevenue) * 100 : 0,
        },
        byProperty,
        series,
      };
    } catch (error) {
      console.error("Error fetching property financials:", error);
      return {
        summary: { revenue: 0, invoicesPaidPct: 0 },
        byProperty: [],
        series: [],
      };
    }
  }

  /**
   * Get financial data for service providers based on invoices
   */
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
    try {
      const { providerId, from, to, granularity } = params;

      // Get all invoices
      const invoices = await InvoiceService.getInvoices();

      // Filter invoices by date range if specified
      let filteredInvoices = invoices;
      if (from && to && from.trim() !== "" && to.trim() !== "") {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        filteredInvoices = invoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.issueDate);
          return invoiceDate >= fromDate && invoiceDate <= toDate;
        });
      }
      // If no date filter, use all invoices

      // Filter by provider if specified
      if (providerId) {
        filteredInvoices = filteredInvoices.filter(
          (invoice) => invoice.providerId === providerId
        );
      }

      // Get providers for reference
      const providersResponse = await ServiceProviderService.getProviders();
      const providers = providersResponse?.providers || []; // Extract the providers array with fallback

      // Calculate summary
      const totalRevenue = filteredInvoices.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      );
      const totalExpenses = totalRevenue * 0.3; // 30% assumption for now
      const totalProfit = totalRevenue * 0.7; // 70% assumption for now
      const paidInvoices = filteredInvoices.filter(
        (invoice) => invoice.status === "paid"
      );
      const totalPaidAmount = paidInvoices.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      );

      // Calculate by provider
      const byProvider = providers
        .map((provider) => {
          const providerInvoices = filteredInvoices.filter(
            (invoice) => invoice.providerId === provider.id
          );

          if (providerInvoices.length === 0) return null;

          const providerRevenue = providerInvoices.reduce(
            (sum, invoice) => sum + invoice.total,
            0
          );
          const providerPaidInvoices = providerInvoices.filter(
            (invoice) => invoice.status === "paid"
          );
          const providerPaidAmount = providerPaidInvoices.reduce(
            (sum, invoice) => sum + invoice.total,
            0
          );

          return {
            providerId: provider.id,
            providerName: provider.name,
            service: provider.service,
            revenue: providerRevenue,
            profit: providerRevenue * 0.7,
            marginPct: 70.0,
            invoicesPaidPct:
              providerRevenue > 0
                ? (providerPaidAmount / providerRevenue) * 100
                : 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b?.revenue || 0) - (a?.revenue || 0)); // Sort by revenue descending

      // Generate time series data based on granularity
      const series = this.generateTimeSeriesData(
        filteredInvoices,
        granularity,
        providers,
        "provider"
      );

      return {
        summary: {
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalProfit,
          marginPct: 70.0,
          invoicesPaidPct:
            totalRevenue > 0 ? (totalPaidAmount / totalRevenue) * 100 : 0,
        },
        byProvider,
        series,
      };
    } catch (error) {
      console.error("Error fetching provider financials:", error);
      return {
        summary: { revenue: 0, invoicesPaidPct: 0 },
        byProvider: [],
        series: [],
      };
    }
  }

  /**
   * Get combined financial data for property + provider combinations
   */
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
    byProperty: any[];
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
    try {
      const { propertyId, providerId, from, to, granularity } = params;

      // Get all invoices
      const invoices = await InvoiceService.getInvoices();

      // Filter invoices by date range if specified
      let filteredInvoices = invoices;
      if (from && to && from.trim() !== "" && to.trim() !== "") {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        filteredInvoices = invoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.issueDate);
          return invoiceDate >= fromDate && invoiceDate <= toDate;
        });
      }
      // If no date filter, use all invoices

      // Apply filters
      if (propertyId) {
        filteredInvoices = filteredInvoices.filter(
          (invoice) => invoice.propertyId === propertyId
        );
      }

      if (providerId) {
        filteredInvoices = filteredInvoices.filter(
          (invoice) => invoice.providerId === providerId
        );
      }

      // Get properties and providers for reference
      const [propertiesResponse, providersResponse] = await Promise.all([
        PropertyService.getProperties(),
        ServiceProviderService.getProviders(),
      ]);
      const properties = propertiesResponse || [];
      const providers = providersResponse?.providers || []; // Extract the providers array with fallback

      // Calculate summary
      const totalRevenue = filteredInvoices.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      );
      const totalExpenses = totalRevenue * 0.3; // 30% assumption for now
      const totalProfit = totalRevenue * 0.7; // 70% assumption for now
      const paidInvoices = filteredInvoices.filter(
        (invoice) => invoice.status === "paid"
      );
      const totalPaidAmount = paidInvoices.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      );

      // Calculate by property
      const byProperty = properties
        .map((property) => {
          const propertyInvoices = filteredInvoices.filter(
            (invoice) => invoice.propertyId === property.id
          );

          if (propertyInvoices.length === 0) return null;

          const propertyRevenue = propertyInvoices.reduce(
            (sum, invoice) => sum + invoice.total,
            0
          );
          const propertyPaidInvoices = propertyInvoices.filter(
            (invoice) => invoice.status === "paid"
          );
          const propertyPaidAmount = propertyPaidInvoices.reduce(
            (sum, invoice) => sum + invoice.total,
            0
          );

          return {
            propertyId: property.id,
            propertyName: property.name,
            revenue: propertyRevenue,
            profit: propertyRevenue * 0.7,
            marginPct: 70.0,
            invoicesPaidPct:
              propertyRevenue > 0
                ? (propertyPaidAmount / propertyRevenue) * 100
                : 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b?.revenue || 0) - (a?.revenue || 0));

      // Calculate by provider
      const byProvider = providers
        .map((provider) => {
          const providerInvoices = filteredInvoices.filter(
            (invoice) => invoice.providerId === provider.id
          );

          if (providerInvoices.length === 0) return null;

          const providerRevenue = providerInvoices.reduce(
            (sum, invoice) => sum + invoice.total,
            0
          );
          const providerPaidInvoices = providerInvoices.filter(
            (invoice) => invoice.status === "paid"
          );
          const providerPaidAmount = providerPaidInvoices.reduce(
            (sum, invoice) => sum + invoice.total,
            0
          );

          return {
            providerId: provider.id,
            providerName: provider.name,
            service: provider.service,
            revenue: providerRevenue,
            profit: providerRevenue * 0.7,
            marginPct: 70.0,
            invoicesPaidPct:
              providerRevenue > 0
                ? (providerPaidAmount / providerRevenue) * 100
                : 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b?.revenue || 0) - (a?.revenue || 0));

      // Generate combined data (property + provider combinations)
      const combinedData = properties
        .map((property) => {
          const propertyInvoices = filteredInvoices.filter(
            (invoice) => invoice.propertyId === property.id
          );

          if (propertyInvoices.length === 0) return null;

          // Group by provider within this property
          const providerGroups = providers
            .map((provider) => {
              const providerInvoices = propertyInvoices.filter(
                (invoice) => invoice.providerId === provider.id
              );

              if (providerInvoices.length === 0) return null;

              const revenue = providerInvoices.reduce(
                (sum, invoice) => sum + invoice.total,
                0
              );
              const paidInvoices = providerInvoices.filter(
                (invoice) => invoice.status === "paid"
              );
              const paidAmount = paidInvoices.reduce(
                (sum, invoice) => sum + invoice.total,
                0
              );

              return {
                propertyName: property.name,
                providerName: provider.name,
                revenue,
                profit: revenue * 0.7,
                marginPct: 70.0,
                invoicesPaidPct: revenue > 0 ? (paidAmount / revenue) * 100 : 0,
              };
            })
            .filter(Boolean);

          return providerGroups;
        })
        .filter(Boolean)
        .flat()
        .sort((a, b) => (b?.revenue || 0) - (a?.revenue || 0));

      // Generate time series data
      const series = this.generateTimeSeriesData(
        filteredInvoices,
        granularity,
        properties
      );

      return {
        summary: {
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalProfit,
          marginPct: 70.0,
          invoicesPaidPct:
            totalRevenue > 0 ? (totalPaidAmount / totalRevenue) * 100 : 0,
        },
        byProperty,
        byProvider,
        series,
        combinedData,
      };
    } catch (error) {
      console.error("Error fetching combined financials:", error);
      return {
        summary: { revenue: 0, invoicesPaidPct: 0 },
        byProperty: [],
        byProvider: [],
        series: [],
        combinedData: [],
      };
    }
  }

  /**
   * Generate time series data based on granularity
   */
  private generateTimeSeriesData(
    invoices: Invoice[],
    granularity: PeriodGranularity,
    entities: any[],
    entityType: "property" | "provider" = "property"
  ): any[] {
    try {
      const series: any[] = [];

      // Group invoices by period based on granularity
      const periodGroups: { [key: string]: Invoice[] } = {};

      invoices.forEach((invoice) => {
        const date = new Date(invoice.issueDate);
        let periodKey: string;

        switch (granularity) {
          case "WEEK":
            const weekNumber = this.getWeekNumber(date);
            periodKey = `${date.getFullYear()}-W${weekNumber
              .toString()
              .padStart(2, "0")}`;
            break;
          case "MONTH":
            periodKey = `${date.getFullYear()}-${(date.getMonth() + 1)
              .toString()
              .padStart(2, "0")}`;
            break;
          case "YEAR":
            periodKey = date.getFullYear().toString();
            break;
          default:
            periodKey = date.getFullYear().toString();
        }

        if (!periodGroups[periodKey]) {
          periodGroups[periodKey] = [];
        }
        periodGroups[periodKey].push(invoice);
      });

      // Generate series data for each entity
      entities.forEach((entity) => {
        const entityId = entityType === "property" ? entity.id : entity.id;
        const entityName =
          entityType === "property" ? entity.name : entity.name;

        const trend = Object.entries(periodGroups)
          .map(([period, periodInvoices]) => {
            const entityInvoices = periodInvoices.filter((invoice) =>
              entityType === "property"
                ? invoice.propertyId === entityId
                : invoice.providerId === entityId
            );

            const revenue = entityInvoices.reduce(
              (sum, invoice) => sum + invoice.total,
              0
            );
            const profit = revenue * 0.7;

            return {
              label: period,
              revenue,
              profit,
            };
          })
          .filter((item) => item.revenue > 0);

        if (trend.length > 0) {
          // Calculate total revenue and profit for this entity
          const totalRevenue = trend.reduce(
            (sum, item) => sum + item.revenue,
            0
          );
          const totalProfit = trend.reduce((sum, item) => sum + item.profit, 0);

          // Count total invoices for this entity
          const entityInvoices = invoices.filter((invoice) =>
            entityType === "property"
              ? invoice.propertyId === entityId
              : invoice.providerId === entityId
          );
          const paidInvoices = entityInvoices.filter(
            (invoice) => invoice.status === "paid"
          );

          series.push({
            [entityType === "property" ? "propertyId" : "providerId"]: entityId,
            [entityType === "property" ? "propertyName" : "providerName"]:
              entityName,
            revenue: totalRevenue,
            profit: totalProfit,
            marginPct:
              totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
            currency: "USD",
            revenueDeltaPct: 0, // TODO: Calculate actual delta
            invoices: {
              paid: paidInvoices.length,
              total: entityInvoices.length,
            },
            trend,
          });
        }
      });

      return series;
    } catch (error) {
      console.error("Error generating time series data:", error);
      return [];
    }
  }

  /**
   * Get week number for a date
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

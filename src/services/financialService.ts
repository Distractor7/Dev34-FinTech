import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { Property, Provider } from "@/types/float34";
import { Invoice } from "../types/float34";

export interface FinancialSummary {
  revenue: number;
  expenses: number;
  profit: number;
  marginPct: number;
  invoicesPaidPct: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  overdueAmount?: number;
  pendingAmount?: number;
  serviceProviderCosts?: number;
  operationalCosts?: number;
}

export interface PropertyFinancialData {
  propertyId: string;
  propertyName: string;
  revenue: number;
  expenses: number;
  profit: number;
  marginPct: number;
  invoicesPaidPct: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  overdueAmount?: number;
  pendingAmount?: number;
  serviceProviderCosts?: number;
  operationalCosts?: number;
}

export interface ProviderFinancialData {
  providerId: string;
  providerName: string;
  revenue: number;
  expenses: number;
  profit: number;
  marginPct: number;
  invoicesPaidPct: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
}

export interface FinancialTimeSeries {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  invoiceCount: number;
}

export class FinancialService {
  private static readonly INVOICES_COLLECTION = "invoices";
  private static readonly PROPERTIES_COLLECTION = "properties";
  private static readonly PROVIDERS_COLLECTION = "serviceProviders";

  /**
   * Get comprehensive financial summary for all properties
   */
  static async getFinancialSummary(
    fromDate: string,
    toDate: string
  ): Promise<FinancialSummary> {
    try {
      const invoices = await this.getInvoicesInDateRange(fromDate, toDate);

      const totalRevenue = invoices.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      );
      const paidInvoices = invoices.filter(
        (invoice) => invoice.status === "paid"
      );
      const paidRevenue = paidInvoices.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      );

      // Calculate expenses (for now, assume 30% of revenue as expenses)
      // In a real app, you'd track actual expenses
      const expenses = totalRevenue * 0.3;
      const profit = totalRevenue - expenses;
      const marginPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      const invoicesPaidPct =
        invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;

      const overdueInvoices = invoices.filter(
        (invoice) =>
          invoice.status === "overdue" && new Date(invoice.dueDate) < new Date()
      );

      return {
        revenue: totalRevenue,
        expenses,
        profit,
        marginPct: Math.round(marginPct * 100) / 100,
        invoicesPaidPct: Math.round(invoicesPaidPct * 100) / 100,
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length,
        overdueInvoices: overdueInvoices.length,
      };
    } catch (error) {
      console.error("Error getting financial summary:", error);
      return {
        revenue: 0,
        expenses: 0,
        profit: 0,
        marginPct: 0,
        invoicesPaidPct: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0,
      };
    }
  }

  /**
   * Get financial data by property
   */
  static async getPropertyFinancials(
    fromDate: string,
    toDate: string
  ): Promise<PropertyFinancialData[]> {
    try {
      const [invoices, properties] = await Promise.all([
        this.getInvoicesInDateRange(fromDate, toDate),
        this.getAllProperties(),
      ]);

      console.log("Property Financials Debug:", {
        invoicesCount: invoices.length,
        propertiesCount: properties.length,
        invoices: invoices.map((inv) => ({
          id: inv.id,
          propertyId: inv.propertyId,
          total: inv.total,
          status: inv.status,
        })),
        properties: properties.map((prop) => ({
          id: prop.id,
          name: prop.name,
        })),
      });

      const propertyFinancials = new Map<string, PropertyFinancialData>();

      // Initialize property financial data
      properties.forEach((property) => {
        propertyFinancials.set(property.id, {
          propertyId: property.id,
          propertyName: property.name,
          revenue: 0,
          expenses: 0,
          profit: 0,
          marginPct: 0,
          invoicesPaidPct: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0,
        });
      });

      // Aggregate invoice data by property
      invoices.forEach((invoice) => {
        const propertyId = invoice.propertyId;
        const propertyData = propertyFinancials.get(propertyId);

        if (propertyData) {
          propertyData.revenue += invoice.total;
          propertyData.totalInvoices += 1;

          if (invoice.status === "paid") {
            propertyData.paidInvoices += 1;
          } else if (invoice.status === "overdue") {
            propertyData.overdueInvoices += 1;
          }
        } else {
          console.warn(
            `Invoice ${invoice.id} references unknown property: ${propertyId}`
          );
        }
      });

      // Calculate derived metrics
      propertyFinancials.forEach((propertyData) => {
        propertyData.expenses = propertyData.revenue * 0.3; // Assume 30% expenses
        propertyData.profit = propertyData.revenue - propertyData.expenses;
        propertyData.marginPct =
          propertyData.revenue > 0
            ? Math.round(
                (propertyData.profit / propertyData.revenue) * 100 * 100
              ) / 100
            : 0;
        propertyData.invoicesPaidPct =
          propertyData.totalInvoices > 0
            ? Math.round(
                (propertyData.paidInvoices / propertyData.totalInvoices) *
                  100 *
                  100
              ) / 100
            : 0;
      });

      const result = Array.from(propertyFinancials.values()).sort(
        (a, b) => b.revenue - a.revenue
      );

      console.log("Property Financials Result:", result);
      return result;
    } catch (error) {
      console.error("Error getting property financials:", error);
      return [];
    }
  }

  /**
   * Get financial data by service provider
   */
  static async getProviderFinancials(
    fromDate: string,
    toDate: string
  ): Promise<ProviderFinancialData[]> {
    try {
      const [invoices, providers] = await Promise.all([
        this.getInvoicesInDateRange(fromDate, toDate),
        this.getAllProviders(),
      ]);

      const providerFinancials = new Map<string, ProviderFinancialData>();

      // Initialize provider financial data
      providers.forEach((provider) => {
        providerFinancials.set(provider.id, {
          providerId: provider.id,
          providerName: provider.businessName || provider.name,
          revenue: 0,
          expenses: 0,
          profit: 0,
          marginPct: 0,
          invoicesPaidPct: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0,
        });
      });

      // Aggregate invoice data by provider
      invoices.forEach((invoice) => {
        const providerId = invoice.providerId;
        const providerData = providerFinancials.get(providerId);

        if (providerData) {
          providerData.revenue += invoice.total;
          providerData.totalInvoices += 1;

          if (invoice.status === "paid") {
            providerData.paidInvoices += 1;
          } else if (invoice.status === "overdue") {
            providerData.overdueInvoices += 1;
          }
        }
      });

      // Calculate derived metrics
      providerFinancials.forEach((providerData) => {
        providerData.expenses = providerData.revenue * 0.3; // Assume 30% expenses
        providerData.profit = providerData.revenue - providerData.expenses;
        providerData.marginPct =
          providerData.revenue > 0
            ? Math.round(
                (providerData.profit / providerData.revenue) * 100 * 100
              ) / 100
            : 0;
        providerData.invoicesPaidPct =
          providerData.totalInvoices > 0
            ? Math.round(
                (providerData.paidInvoices / providerData.totalInvoices) *
                  100 *
                  100
              ) / 100
            : 0;
      });

      // Return sorted by revenue (highest first)
      return Array.from(providerFinancials.values()).sort(
        (a, b) => b.revenue - a.revenue
      );
    } catch (error) {
      console.error("Error getting provider financials:", error);
      return [];
    }
  }

  /**
   * Get time series data for charts
   */
  static async getTimeSeriesData(
    fromDate: string,
    toDate: string,
    granularity: "WEEK" | "MONTH" | "YEAR"
  ): Promise<FinancialTimeSeries[]> {
    try {
      const invoices = await this.getInvoicesInDateRange(fromDate, toDate);

      console.log("Time Series Debug:", {
        fromDate,
        toDate,
        granularity,
        invoicesCount: invoices.length,
        sampleInvoice: invoices[0]
          ? {
              id: invoices[0].id,
              issueDate: invoices[0].issueDate,
              total: invoices[0].total,
            }
          : null,
      });

      // Group invoices by period based on granularity
      const periodGroups = new Map<string, FinancialTimeSeries>();

      invoices.forEach((invoice) => {
        const period = this.getPeriodFromDate(invoice.issueDate, granularity);

        if (period === "Invalid Date") {
          console.warn(
            `Skipping invoice with invalid date: ${invoice.id}, date: ${invoice.issueDate}`
          );
          return;
        }

        if (!periodGroups.has(period)) {
          periodGroups.set(period, {
            period,
            revenue: 0,
            expenses: 0,
            profit: 0,
            invoiceCount: 0,
          });
        }

        const periodData = periodGroups.get(period)!;
        periodData.revenue += invoice.total;
        periodData.invoiceCount += 1;
      });

      // Calculate expenses and profit for each period
      periodGroups.forEach((periodData) => {
        periodData.expenses = periodData.revenue * 0.3;
        periodData.profit = periodData.revenue - periodData.expenses;
      });

      const result = Array.from(periodGroups.values()).sort((a, b) =>
        a.period.localeCompare(b.period)
      );

      console.log("Time Series Result:", result);
      return result;
    } catch (error) {
      console.error("Error getting time series data:", error);
      return [];
    }
  }

  /**
   * Create sample properties and providers for testing
   */
  static async createSampleEntities(): Promise<void> {
    try {
      // Check if sample entities already exist
      const [existingProperties, existingProviders] = await Promise.all([
        this.getAllProperties(),
        this.getAllProviders(),
      ]);

      if (existingProperties.length > 0 && existingProviders.length > 0) {
        console.log("Sample entities already exist, skipping creation");
        return;
      }

      console.log("Creating sample properties and providers...");

      // Create sample properties
      const sampleProperties = [
        {
          id: "sample-property-1",
          tenantId: "sample-tenant-1",
          name: "Sample Office Building",
          address: "123 Business Street, Johannesburg",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "sample-property-2",
          tenantId: "sample-tenant-2",
          name: "Sample Retail Center",
          address: "456 Commerce Avenue, Cape Town",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // Create sample providers
      const sampleProviders = [
        {
          id: "sample-provider-1",
          name: "CleanPro Services",
          email: "info@cleanpro.co.za",
          phone: "+27 11 123 4567",
          service: "Cleaning",
          status: "active",
          rating: 4.8,
          propertyIds: ["sample-property-1", "sample-property-2"],
          businessName: "CleanPro Services",
          serviceCategories: ["cleaning", "maintenance"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "sample-provider-2",
          name: "MaintainTech",
          email: "contact@maintaintech.co.za",
          phone: "+27 11 234 5678",
          service: "Maintenance",
          status: "active",
          rating: 4.6,
          propertyIds: ["sample-property-1"],
          businessName: "MaintainTech Solutions",
          serviceCategories: ["maintenance", "repairs"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "sample-provider-3",
          name: "GreenScape",
          email: "hello@greenscape.co.za",
          phone: "+27 11 345 6789",
          service: "Landscaping",
          status: "active",
          rating: 4.4,
          propertyIds: ["sample-property-2"],
          businessName: "GreenScape Landscaping",
          serviceCategories: ["landscaping", "maintenance"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // Add properties and providers to Firestore
      const batch = writeBatch(db);

      sampleProperties.forEach((property) => {
        const docRef = doc(
          collection(db, this.PROPERTIES_COLLECTION),
          property.id
        );
        batch.set(docRef, property);
      });

      sampleProviders.forEach((provider) => {
        const docRef = doc(
          collection(db, this.PROVIDERS_COLLECTION),
          provider.id
        );
        batch.set(docRef, provider);
      });

      await batch.commit();
      console.log(
        `Successfully created ${sampleProperties.length} properties and ${sampleProviders.length} providers`
      );
    } catch (error) {
      console.error("Error creating sample entities:", error);
    }
  }

  /**
   * Restore real invoice data that was accidentally deleted
   */
  static async restoreRealInvoiceData(): Promise<void> {
    try {
      console.log("🔄 Restoring real invoice data...");

      // Check if the real invoice already exists
      const existingInvoices = await this.getInvoicesInDateRange(
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
      );

      const hasRealInvoice = existingInvoices.some(
        (inv) =>
          inv.invoiceNumber === "INV-2024-001" ||
          inv.propertyId === "prop_kny_mall"
      );

      if (hasRealInvoice) {
        console.log("✅ Real invoice data already exists");
        return;
      }

      // Create the real invoice
      const invoiceRef = doc(collection(db, this.INVOICES_COLLECTION));
      await setDoc(invoiceRef, {
        id: "invoice_001",
        invoiceNumber: "INV-2024-001",
        propertyId: "prop_kny_mall",
        providerId: "prov_parking_plus",
        description: "Monthly parking maintenance services",
        issueDate: new Date("2025-08-13T12:14:39Z"),
        dueDate: new Date("2025-08-14T12:14:59Z"),
        status: "draft",
        subtotal: 1250.5,
        tax: 125,
        total: 1375,
        lineItems: [
          {
            description: "Parking lot cleaning",
            quantity: 1,
            unitPrice: 500,
            total: 500,
          },
          {
            description: "Security monitoring",
            quantity: 30,
            unitPrice: 25,
            total: 750,
          },
        ],
        notes: "Services provided for January 2024",
        paidDate: null,
        tenantId: "tenant_1",
        createdAt: new Date("2025-08-13T12:23:25Z"),
        updatedAt: new Date("2025-08-13T12:24:09Z"),
      });

      console.log("✅ Restored real invoice: invoice_001 - $1,375.00");
      console.log("🎉 Your financial data should now work! Refresh the page.");
    } catch (error) {
      console.error("❌ Error restoring real invoice data:", error);
    }
  }

  /**
   * Create missing property for existing invoice data
   */
  static async createMissingPropertyForInvoice(): Promise<void> {
    try {
      console.log("🏗️ Creating missing property for existing invoice...");

      // Check if the property already exists
      const existingProperties = await this.getAllProperties();
      const hasKnysnaMall = existingProperties.some(
        (prop) => prop.id === "prop_kny_mall" || prop.name === "Knysna Mall"
      );

      if (hasKnysnaMall) {
        console.log("✅ Property for Knysna Mall already exists");
        return;
      }

      // Create the missing property with the exact ID the invoice references
      const propertyRef = doc(
        collection(db, this.PROPERTIES_COLLECTION),
        "prop_kny_mall"
      );
      await setDoc(propertyRef, {
        id: "prop_kny_mall",
        tenantId: "tenant_1",
        name: "Knysna Mall",
        address: "Knysna, Western Cape, South Africa",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log("✅ Created property: prop_kny_mall (Knysna Mall)");

      // Also create the provider if it doesn't exist
      const existingProviders = await this.getAllProviders();
      const hasParkingPlus = existingProviders.some(
        (prov) =>
          prov.id === "prov_parking_plus" ||
          prov.name === "Parking Plus Services"
      );

      if (!hasParkingPlus) {
        const providerRef = doc(
          collection(db, this.PROVIDERS_COLLECTION),
          "prov_parking_plus"
        );
        await setDoc(providerRef, {
          id: "prov_parking_plus",
          name: "Parking Plus Services",
          email: "info@parkingplus.co.za",
          phone: "+27 44 123 4567",
          service: "Parking Services",
          status: "active",
          rating: 4.5,
          propertyIds: ["prop_kny_mall"],
          businessName: "Parking Plus Services",
          serviceCategories: ["parking", "security", "maintenance"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        console.log(
          "✅ Created provider: prov_parking_plus (Parking Plus Services)"
        );
      }

      console.log("🎉 Data linkage fixed! Refresh the page to see results.");
    } catch (error) {
      console.error("❌ Error creating missing property:", error);
    }
  }

  /**
   * Debug method to check what data exists in the database
   */
  static async debugDatabaseState(): Promise<void> {
    try {
      console.log("🔍 DEBUGGING DATABASE STATE...");

      // Check properties
      const properties = await this.getAllProperties();
      console.log("📋 Properties found:", properties.length);
      properties.forEach((prop) => {
        console.log(`  - ${prop.id}: ${prop.name} (${prop.status})`);
      });

      // Check providers
      const providers = await this.getAllProviders();
      console.log("👥 Providers found:", providers.length);
      providers.forEach((prov) => {
        console.log(
          `  - ${prov.id}: ${prov.businessName || prov.name} (${prov.status})`
        );
      });

      // Check invoices
      const allInvoices = await this.getInvoicesInDateRange(
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // Last year
        new Date().toISOString()
      );
      console.log("🧾 Invoices found:", allInvoices.length);
      allInvoices.forEach((inv) => {
        console.log(
          `  - ${inv.invoiceNumber}: $${inv.total} for property ${inv.propertyId} (${inv.status})`
        );
      });

      // Check if there are any data mismatches
      const propertyIds = new Set(properties.map((p) => p.id));
      const invoicePropertyIds = new Set(allInvoices.map((i) => i.propertyId));

      console.log("🔗 Data Linkage Check:");
      console.log("  - Properties with IDs:", Array.from(propertyIds));
      console.log(
        "  - Invoices referencing properties:",
        Array.from(invoicePropertyIds)
      );

      const orphanedInvoices = allInvoices.filter(
        (inv) => !propertyIds.has(inv.propertyId)
      );
      if (orphanedInvoices.length > 0) {
        console.warn(
          "⚠️ Orphaned invoices (no matching property):",
          orphanedInvoices
        );
      }

      const unusedProperties = properties.filter(
        (prop) => !invoicePropertyIds.has(prop.id)
      );
      if (unusedProperties.length > 0) {
        console.warn("⚠️ Properties with no invoices:", unusedProperties);
      }
    } catch (error) {
      console.error("❌ Error debugging database state:", error);
    }
  }

  /**
   * Clear all sample data and recreate it fresh
   */
  static async clearAndReseedSampleData(): Promise<void> {
    try {
      console.log("🧹 Clearing all sample data...");

      // Get all existing data
      const [properties, providers, invoices] = await Promise.all([
        this.getAllProperties(),
        this.getAllProviders(),
        this.getInvoicesInDateRange(
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          new Date().toISOString()
        ),
      ]);

      // Delete all sample data
      const batch = writeBatch(db);

      // Only delete properties that are clearly sample data
      properties.forEach((property) => {
        if (property.id.startsWith("sample-")) {
          const docRef = doc(db, this.PROPERTIES_COLLECTION, property.id);
          batch.delete(docRef);
          console.log(`🗑️ Deleting sample property: ${property.id}`);
        } else {
          console.log(
            `✅ Preserving real property: ${property.id} (${property.name})`
          );
        }
      });

      // Only delete providers that are clearly sample data
      providers.forEach((provider) => {
        if (provider.id.startsWith("sample-")) {
          const docRef = doc(db, this.PROPERTIES_COLLECTION, provider.id);
          batch.delete(docRef);
          console.log(`🗑️ Deleting sample provider: ${provider.id}`);
        } else {
          console.log(
            `✅ Preserving real provider: ${provider.id} (${
              provider.businessName || provider.name
            })`
          );
        }
      });

      // Only delete invoices that are clearly sample data
      invoices.forEach((invoice) => {
        // Check if it's sample data by multiple criteria
        const isSampleInvoice =
          invoice.id.startsWith("sample-") ||
          (invoice.invoiceNumber &&
            invoice.invoiceNumber.startsWith("SAMPLE-INV-")) ||
          (invoice.propertyId && invoice.propertyId.startsWith("sample-")) ||
          (invoice.providerId && invoice.providerId.startsWith("sample-"));

        if (isSampleInvoice) {
          const docRef = doc(db, this.INVOICES_COLLECTION, invoice.id);
          batch.delete(docRef);
          console.log(`🗑️ Deleting sample invoice: ${invoice.id}`);
        } else {
          console.log(
            `✅ Preserving real invoice: ${invoice.id} (${invoice.invoiceNumber}) - $${invoice.total}`
          );
        }
      });

      await batch.commit();
      console.log("✅ Cleared all sample data, preserved real data");

      // Now recreate fresh sample data
      console.log("🌱 Creating fresh sample data...");
      await this.seedSampleData();
    } catch (error) {
      console.error("❌ Error clearing and reseeding data:", error);
    }
  }

  /**
   * Seed sample financial data for testing
   * This creates sample invoices to demonstrate the financial reports
   */
  static async seedSampleData(): Promise<void> {
    try {
      console.log("Starting sample data seeding...");

      // Check if we already have sample data
      const existingInvoices = await this.getInvoicesInDateRange(
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        new Date().toISOString()
      );

      if (existingInvoices.length > 0) {
        console.log("Sample data already exists, skipping seed");
        console.log(
          "Existing invoices:",
          existingInvoices.map((inv) => ({
            id: inv.id,
            propertyId: inv.propertyId,
            total: inv.total,
          }))
        );
        return;
      }

      console.log("Seeding sample financial data...");

      // First create sample properties and providers
      await this.createSampleEntities();

      // Create sample invoices for the last 3 months
      const sampleInvoices = [
        {
          invoiceNumber: "INV-001",
          propertyId: "sample-property-1",
          providerId: "sample-provider-1",
          description: "Monthly cleaning services",
          issueDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "paid",
          subtotal: 1500,
          tax: 150,
          total: 1650,
          lineItems: [
            {
              description: "Monthly cleaning service",
              quantity: 1,
              unitPrice: 1500,
              total: 1500,
            },
          ],
        },
        {
          invoiceNumber: "INV-002",
          propertyId: "sample-property-1",
          providerId: "sample-provider-2",
          description: "Maintenance and repairs",
          issueDate: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() - 45 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "paid",
          subtotal: 2500,
          tax: 250,
          total: 2750,
          lineItems: [
            {
              description: "HVAC maintenance",
              quantity: 1,
              unitPrice: 1500,
              total: 1500,
            },
            {
              description: "Plumbing repairs",
              quantity: 1,
              unitPrice: 1000,
              total: 1000,
            },
          ],
        },
        {
          invoiceNumber: "INV-003",
          propertyId: "sample-property-2",
          providerId: "sample-provider-1",
          description: "Security services",
          issueDate: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() + 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "sent",
          subtotal: 2000,
          tax: 200,
          total: 2200,
          lineItems: [
            {
              description: "Monthly security monitoring",
              quantity: 1,
              unitPrice: 2000,
              total: 2000,
            },
          ],
        },
        {
          invoiceNumber: "INV-004",
          propertyId: "sample-property-2",
          providerId: "sample-provider-3",
          description: "Landscaping services",
          issueDate: new Date(
            Date.now() - 45 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "overdue",
          subtotal: 800,
          tax: 80,
          total: 880,
          lineItems: [
            {
              description: "Monthly landscaping maintenance",
              quantity: 1,
              unitPrice: 800,
              total: 800,
            },
          ],
        },
      ];

      console.log(
        "Sample invoices to create:",
        sampleInvoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          propertyId: inv.propertyId,
          total: inv.total,
          issueDate: inv.issueDate,
        }))
      );

      // Add invoices to Firestore
      const batch = writeBatch(db);

      sampleInvoices.forEach((invoice, index) => {
        const docRef = doc(collection(db, this.INVOICES_COLLECTION));
        batch.set(docRef, {
          ...invoice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();
      console.log(
        `Successfully seeded ${sampleInvoices.length} sample invoices`
      );

      // Refresh the page to show the new data
      window.location.reload();
    } catch (error) {
      console.error("Error seeding sample data:", error);
    }
  }

  /**
   * Get invoices within a specific date range
   */
  private static async getInvoicesInDateRange(
    fromDate: string,
    toDate: string
  ): Promise<Invoice[]> {
    try {
      console.log("🔍 Fetching invoices in date range:", { fromDate, toDate });

      // Validate input dates
      if (!fromDate || !toDate) {
        console.warn("Invalid date inputs:", { fromDate, toDate });
        return [];
      }

      // Handle different date formats properly
      let fromTimestamp: Timestamp;
      let toTimestamp: Timestamp;

      try {
        // Handle year-only format (e.g., "2024")
        if (/^\d{4}$/.test(fromDate)) {
          fromTimestamp = Timestamp.fromDate(
            new Date(parseInt(fromDate), 0, 1)
          ); // January 1st of the year
        } else {
          const fromDateObj = new Date(fromDate);
          if (isNaN(fromDateObj.getTime())) {
            console.warn("Invalid from date:", fromDate);
            return [];
          }
          fromTimestamp = Timestamp.fromDate(fromDateObj);
        }

        if (/^\d{4}$/.test(toDate)) {
          toTimestamp = Timestamp.fromDate(
            new Date(parseInt(toDate), 11, 31, 23, 59, 59)
          ); // December 31st of the year
        } else {
          const toDateObj = new Date(toDate);
          if (isNaN(toDateObj.getTime())) {
            console.warn("Invalid to date:", toDate);
            return [];
          }
          toTimestamp = Timestamp.fromDate(toDateObj);
        }

        // Ensure from date is before to date
        if (fromTimestamp.toDate() > toTimestamp.toDate()) {
          console.warn("From date is after to date, swapping dates");
          [fromTimestamp, toTimestamp] = [toTimestamp, fromTimestamp];
        }

        console.log("🔍 Converted timestamps:", {
          fromTimestamp: fromTimestamp.toDate(),
          toTimestamp: toTimestamp.toDate(),
        });
      } catch (dateError) {
        console.error("Error parsing dates:", dateError);
        return [];
      }

      const invoicesQuery = query(
        collection(db, this.INVOICES_COLLECTION),
        where("issueDate", ">=", fromTimestamp),
        where("issueDate", "<=", toTimestamp),
        orderBy("issueDate", "desc")
      );

      const querySnapshot = await getDocs(invoicesQuery);
      const invoices = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Invoice[];

      console.log("🔍 Invoices found in date range:", {
        totalInvoices: invoices.length,
        invoices: invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          propertyId: inv.propertyId,
          total: inv.total,
          issueDate: inv.issueDate,
          status: inv.status,
        })),
      });

      return invoices;
    } catch (error) {
      console.error("❌ Error getting invoices in date range:", error);
      // Return empty array if collection doesn't exist yet
      return [];
    }
  }

  /**
   * Get all properties
   */
  private static async getAllProperties(): Promise<Property[]> {
    try {
      console.log(
        "🔍 Fetching all properties from collection:",
        this.PROPERTIES_COLLECTION
      );

      const propertiesQuery = query(collection(db, this.PROPERTIES_COLLECTION));
      const querySnapshot = await getDocs(propertiesQuery);
      const properties = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Property[];

      console.log("🔍 Properties found:", {
        totalProperties: properties.length,
        properties: properties.map((prop) => ({
          id: prop.id,
          name: prop.name,
          status: prop.status,
          tenantId: prop.tenantId,
        })),
      });

      return properties;
    } catch (error) {
      console.error("❌ Error getting properties:", error);
      return [];
    }
  }

  /**
   * Get all service providers
   */
  private static async getAllProviders(): Promise<Provider[]> {
    try {
      const providersQuery = query(collection(db, this.PROVIDERS_COLLECTION));
      const querySnapshot = await getDocs(providersQuery);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Provider[];
    } catch (error) {
      console.error("Error getting providers:", error);
      // Return empty array if collection doesn't exist yet
      return [];
    }
  }

  /**
   * Convert a date to a period string based on granularity
   */
  private static getPeriodFromDate(
    dateInput: string | any, // Accept Firebase Timestamp or string
    granularity: "WEEK" | "MONTH" | "YEAR"
  ): string {
    try {
      let date: Date;

      // Handle Firebase Timestamp objects
      if (dateInput && typeof dateInput === "object" && dateInput.seconds) {
        // It's a Firebase Timestamp
        date = new Date(dateInput.seconds * 1000);
        console.log(
          "Converting Firebase Timestamp to Date:",
          dateInput.seconds,
          "→",
          date
        );
      } else if (typeof dateInput === "string") {
        // It's a string date
        date = new Date(dateInput);
      } else if (
        dateInput &&
        typeof dateInput === "object" &&
        dateInput.toDate
      ) {
        // It's a Firestore Timestamp with toDate method
        date = dateInput.toDate();
      } else {
        console.warn("Unknown date format:", dateInput);
        return "Invalid Date";
      }

      // Check if date is valid
      if (!date || isNaN(date.getTime())) {
        console.warn("Invalid date after conversion:", dateInput);
        return "Invalid Date";
      }

      switch (granularity) {
        case "WEEK":
          const weekNumber = this.getWeekNumber(date);
          if (weekNumber < 1 || weekNumber > 53) {
            console.warn("Invalid week number:", weekNumber, "for date:", date);
            return "Invalid Date";
          }
          return `${date.getFullYear()}-W${weekNumber
            .toString()
            .padStart(2, "0")}`;
        case "MONTH":
          const month = date.getMonth() + 1;
          if (month < 1 || month > 12) {
            console.warn("Invalid month:", month, "for date:", date);
            return "Invalid Date";
          }
          return `${date.getFullYear()}-${month.toString().padStart(2, "0")}`;
        case "YEAR":
          const year = date.getFullYear();
          if (year < 1900 || year > 2100) {
            console.warn("Invalid year:", year, "for date:", date);
            return "Invalid Date";
          }
          return year.toString();
        default:
          return date.toISOString().split("T")[0];
      }
    } catch (error) {
      console.error("Error parsing date:", dateInput, error);
      return "Invalid Date";
    }
  }

  /**
   * Get week number of the year
   */
  private static getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Create a new invoice
   */
  static async createNewInvoice(): Promise<void> {
    try {
      console.log("📄 Creating new invoice...");

      // Generate unique ID and invoice number
      const timestamp = Date.now();
      const invoiceId = `invoice_${timestamp}`;
      const invoiceNumber = `INV-2024-${String(timestamp).slice(-4)}`;

      const invoiceData = {
        id: invoiceId,
        invoiceNumber: invoiceNumber,
        propertyId: "prop_kny_mall",
        providerId: "prov_parking_plus",
        description: "Monthly cleaning and maintenance services",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: "pending",
        subtotal: 850.0,
        tax: 85.0,
        total: 935.0,
        lineItems: [
          {
            description: "General cleaning services",
            quantity: 1,
            unitPrice: 500.0,
            total: 500.0,
          },
          {
            description: "Maintenance and repairs",
            quantity: 1,
            unitPrice: 350.0,
            total: 350.0,
          },
        ],
        notes: "Services provided for August 2024",
        paidDate: null,
        tenantId: "tenant_1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const invoiceRef = doc(db, this.INVOICES_COLLECTION, invoiceId);
      await setDoc(invoiceRef, invoiceData);

      console.log("✅ New invoice created successfully!");
      console.log("Invoice ID:", invoiceData.id);
      console.log("Invoice Number:", invoiceData.invoiceNumber);
      console.log("Amount: $", invoiceData.total);

      // Show success message and refresh
      alert(`✅ Invoice created! ${invoiceNumber} - $${invoiceData.total}`);

      // Force a page refresh to show new data
      console.log("🔄 Refreshing page to show new invoice data...");
      window.location.reload();
    } catch (error) {
      console.error("❌ Error creating invoice:", error);
      alert("❌ Error creating invoice. Check console for details.");
    }
  }
}

export default FinancialService;

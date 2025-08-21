import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
  runTransaction,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db, DataEncryption, SecurityUtils } from "./firebaseConfig";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  providerId: string;
  propertyId: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: string;
  issueDate: string;
  paidDate?: string;
  description: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceCreateRequest {
  providerId: string;
  propertyId: string;
  amount: number;
  dueDate: string;
  description: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export interface InvoiceUpdateRequest {
  amount?: number;
  status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate?: string;
  description?: string;
  lineItems?: InvoiceLineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  notes?: string;
  paidDate?: string;
}

export interface InvoiceSearchParams {
  status?: string;
  providerId?: string;
  propertyId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  limit?: number;
}

export class InvoiceService {
  private static readonly COLLECTION_NAME = "invoices";
  private static readonly BATCH_SIZE = 20;

  /**
   * Check if Firebase is available and connected
   */
  private static async checkFirebaseConnection(): Promise<boolean> {
    try {
      await getDocs(collection(db, "_health"));
      return true;
    } catch (error) {
      console.warn("⚠️ Firebase connection check failed:", error);
      return false;
    }
  }

  /**
   * Generate a unique invoice number
   */
  private static async generateInvoiceNumber(): Promise<string> {
    try {
      const currentYear = new Date().getFullYear();
      const querySnapshot = await getDocs(
        query(
          collection(db, this.COLLECTION_NAME),
          where("invoiceNumber", ">=", `INV-${currentYear}-000`),
          where("invoiceNumber", "<=", `INV-${currentYear}-999`),
          orderBy("invoiceNumber", "desc"),
          limit(1)
        )
      );

      if (querySnapshot.empty) {
        return `INV-${currentYear}-001`;
      }

      const lastInvoice = querySnapshot.docs[0].data();
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[2]);
      const nextNumber = (lastNumber + 1).toString().padStart(3, "0");

      return `INV-${currentYear}-${nextNumber}`;
    } catch (error) {
      console.error("Error generating invoice number:", error);
      // Fallback to timestamp-based number
      const timestamp = Date.now().toString().slice(-6);
      return `INV-${new Date().getFullYear()}-${timestamp}`;
    }
  }

  /**
   * Clear all sample invoices (for testing purposes)
   */
  static async clearAllSampleInvoices(): Promise<void> {
    try {
      console.log("🧹 Clearing all sample invoices...");

      const invoices = await this.getInvoices();

      if (invoices.length === 0) {
        console.log("No invoices to clear");
        return;
      }

      const batch = writeBatch(db);

      invoices.forEach((invoice) => {
        const docRef = doc(db, this.COLLECTION_NAME, invoice.id);
        batch.delete(docRef);
      });

      await batch.commit();
      console.log(`✅ Successfully cleared ${invoices.length} invoices`);

      // Show success message
      alert(
        `✅ Cleared ${invoices.length} invoices! Refresh the page to see the changes.`
      );
    } catch (error) {
      console.error("❌ Error clearing invoices:", error);
      alert("❌ Error clearing invoices. Check console for details.");
    }
  }

  /**
   * Seed sample invoices with random, realistic data for testing
   */
  static async seedSampleInvoices(): Promise<void> {
    try {
      console.log("🌱 Seeding sample invoices with random data...");

      // Check if we already have sample invoices
      const existingInvoices = await this.getInvoices();
      if (existingInvoices.length > 5) {
        console.log("Sample invoices already exist, skipping seed");
        return;
      }

      // Sample data for realistic invoices
      const sampleData = [
        {
          invoiceNumber: "INV-2024-001",
          propertyId: "sample-property-1", // Fixed: was "prop_kny_mall"
          providerId: "sample-provider-1", // Fixed: was "prov_parking_plus"
          description: "Monthly parking maintenance and security services",
          issueDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "paid" as const,
          subtotal: 1250.0,
          tax: 125.0,
          total: 1375.0,
          lineItems: [
            {
              description: "Parking lot cleaning",
              quantity: 1,
              unitPrice: 500.0,
              total: 500.0,
            },
            {
              description: "Security monitoring",
              quantity: 30,
              unitPrice: 25.0,
              total: 750.0,
            },
          ],
          notes: "Services provided for January 2024",
          paidDate: new Date(
            Date.now() - 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-002",
          propertyId: "sample-property-1", // Fixed: was "prop_kny_mall"
          providerId: "sample-provider-1", // Fixed: was "prov_clean_pro"
          description: "Deep cleaning and sanitization services",
          issueDate: new Date(
            Date.now() - 25 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "paid" as const,
          subtotal: 800.0,
          tax: 80.0,
          total: 880.0,
          lineItems: [
            {
              description: "Deep cleaning service",
              quantity: 1,
              unitPrice: 600.0,
              total: 600.0,
            },
            {
              description: "Sanitization supplies",
              quantity: 1,
              unitPrice: 200.0,
              total: 200.0,
            },
          ],
          notes: "Monthly deep cleaning service",
          paidDate: new Date(
            Date.now() - 18 * 24 * 60 * 60 * 1000
          ).toISOString(),
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-003",
          propertyId: "sample-property-2", // Fixed: was "prop_retail_center"
          providerId: "sample-provider-2", // Fixed: was "prov_maintain_tech"
          description: "HVAC maintenance and electrical repairs",
          issueDate: new Date(
            Date.now() - 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: "sent" as const,
          subtotal: 1500.0,
          tax: 150.0,
          total: 1650.0,
          lineItems: [
            {
              description: "HVAC system maintenance",
              quantity: 1,
              unitPrice: 800.0,
              total: 800.0,
            },
            {
              description: "Electrical repairs",
              quantity: 1,
              unitPrice: 700.0,
              total: 700.0,
            },
          ],
          notes: "Emergency repair services",
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-004",
          propertyId: "sample-property-2", // Fixed: was "prop_retail_center"
          providerId: "sample-provider-3", // Fixed: was "prov_green_scape"
          description: "Landscaping and garden maintenance",
          issueDate: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: "draft" as const,
          subtotal: 450.0,
          tax: 45.0,
          total: 495.0,
          lineItems: [
            {
              description: "Garden maintenance",
              quantity: 1,
              unitPrice: 300.0,
              total: 300.0,
            },
            {
              description: "Plant replacement",
              quantity: 1,
              unitPrice: 150.0,
              total: 150.0,
            },
          ],
          notes: "Monthly landscaping service",
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-005",
          propertyId: "sample-property-1", // Fixed: was "prop_office_building"
          providerId: "sample-provider-1", // Fixed: was "prov_clean_pro"
          description: "Office cleaning and maintenance services",
          issueDate: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() + 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "overdue" as const,
          subtotal: 1200.0,
          tax: 120.0,
          total: 1320.0,
          lineItems: [
            {
              description: "Daily office cleaning",
              quantity: 20,
              unitPrice: 40.0,
              total: 800.0,
            },
            {
              description: "Window cleaning",
              quantity: 1,
              unitPrice: 400.0,
              total: 400.0,
            },
          ],
          notes: "Monthly office maintenance package",
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-006",
          propertyId: "sample-property-1", // Fixed: was "prop_office_building"
          providerId: "sample-provider-2", // Fixed: was "prov_maintain_tech"
          description: "Plumbing and water system maintenance",
          issueDate: new Date(
            Date.now() - 8 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() + 22 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "sent" as const,
          subtotal: 650.0,
          tax: 65.0,
          total: 715.0,
          lineItems: [
            {
              description: "Plumbing inspection",
              quantity: 1,
              unitPrice: 200.0,
              total: 200.0,
            },
            {
              description: "Water system maintenance",
              quantity: 1,
              unitPrice: 450.0,
              total: 450.0,
            },
          ],
          notes: "Quarterly plumbing maintenance",
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-007",
          propertyId: "sample-property-2", // Fixed: was "prop_warehouse"
          providerId: "sample-provider-2", // Fixed: was "prov_security_plus"
          description: "Security system installation and monitoring",
          issueDate: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() + 25 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "draft" as const,
          subtotal: 2500.0,
          tax: 250.0,
          total: 2750.0,
          lineItems: [
            {
              description: "Security camera installation",
              quantity: 1,
              unitPrice: 1200.0,
              total: 1200.0,
            },
            {
              description: "Monitoring system setup",
              quantity: 1,
              unitPrice: 800.0,
              total: 800.0,
            },
            {
              description: "Monthly monitoring fee",
              quantity: 1,
              unitPrice: 500.0,
              total: 500.0,
            },
          ],
          notes: "New security system installation",
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-008",
          propertyId: "sample-property-2", // Fixed: was "prop_warehouse"
          providerId: "sample-provider-1", // Fixed: was "prov_clean_pro"
          description: "Industrial cleaning and waste disposal",
          issueDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() + 27 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "sent" as const,
          subtotal: 1800.0,
          tax: 180.0,
          total: 1980.0,
          lineItems: [
            {
              description: "Industrial cleaning service",
              quantity: 1,
              unitPrice: 1200.0,
              total: 1200.0,
            },
            {
              description: "Waste disposal",
              quantity: 1,
              unitPrice: 600.0,
              total: 600.0,
            },
          ],
          notes: "Monthly industrial cleaning service",
          createdBy: "system",
          updatedBy: "system",
        },
      ];

      // Add invoices to Firestore
      const batch = writeBatch(db);

      sampleData.forEach((invoiceData) => {
        const docRef = doc(collection(db, this.COLLECTION_NAME));
        batch.set(docRef, {
          ...invoiceData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();
      console.log(
        `✅ Successfully seeded ${sampleData.length} sample invoices`
      );

      // Show success message
      alert(
        `✅ Created ${sampleData.length} sample invoices! Refresh the page to see them.`
      );
    } catch (error) {
      console.error("❌ Error seeding sample invoices:", error);
      alert("❌ Error creating sample invoices. Check console for details.");
    }
  }

  /**
   * Seed comprehensive test data for analytics testing
   * Creates invoices for all 12 months across multiple providers and properties
   */
  static async seedComprehensiveTestData(): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> {
    try {
      console.log("🌱 Starting comprehensive test data seeding...");

      // First, clear existing invoices
      await this.clearAllSampleInvoices();

      // Create real service providers first
      console.log("🏗️ Creating service providers...");
      const serviceProviders = await this.createServiceProviders();
      console.log("🔍 Service providers returned:", serviceProviders);
      console.log("🔍 Service providers length:", serviceProviders.length);
      console.log("🔍 Service providers[0]:", serviceProviders[0]);
      console.log("🔍 Service providers[1]:", serviceProviders[1]);
      console.log("🔍 Service providers[2]:", serviceProviders[2]);

      // Validate service providers
      if (!serviceProviders || serviceProviders.length < 3) {
        throw new Error(
          `Failed to create service providers. Expected 3, got ${
            serviceProviders?.length || 0
          }`
        );
      }

      // Create real properties
      console.log("🏢 Creating properties...");
      const properties = await this.createProperties();
      console.log("🔍 Properties returned:", properties);
      console.log("🔍 Properties length:", properties.length);
      console.log("🔍 Properties[0]:", properties[0]);
      console.log("🔍 Properties[1]:", properties[1]);

      // Validate properties
      if (!properties || properties.length < 3) {
        throw new Error(
          `Failed to create properties. Expected 3, got ${
            properties?.length || 0
          }`
        );
      }

      // Additional validation
      if (
        !serviceProviders[0]?.id ||
        !serviceProviders[1]?.id ||
        !serviceProviders[2]?.id
      ) {
        throw new Error("Service providers missing IDs");
      }
      if (!properties[0]?.id || !properties[1]?.id || !properties[2]?.id) {
        throw new Error("Properties missing IDs");
      }

      console.log("✅ Validation passed - proceeding with invoice creation");

      // Define test data structure using REAL IDs
      const testData = [
        // January 2024 - Cleaning Services
        {
          invoiceNumber: "INV-2024-001",
          propertyId: properties[0].id, // Knysna Mall
          providerId: serviceProviders[0].id, // CleanPro Services
          description: "Monthly cleaning services - January 2024",
          issueDate: new Date(2024, 0, 15).toISOString(), // Jan 15, 2024
          dueDate: new Date(2024, 1, 15).toISOString(), // Feb 15, 2024
          status: "paid" as const,
          subtotal: 1200.0,
          tax: 120.0,
          total: 1320.0,
          lineItems: [
            {
              description: "General cleaning",
              quantity: 1,
              unitPrice: 800.0,
              total: 800.0,
            },
            {
              description: "Window cleaning",
              quantity: 1,
              unitPrice: 400.0,
              total: 400.0,
            },
          ],
          notes: "Monthly cleaning services for January",
          paidDate: new Date(2024, 1, 10).toISOString(),
          createdBy: "system",
          updatedBy: "system",
        },

        // February 2024 - Fiber Internet
        {
          invoiceNumber: "INV-2024-002",
          propertyId: properties[1].id, // Cavendish Close
          providerId: serviceProviders[1].id, // FiberNet Solutions
          description:
            "Fiber internet installation and monthly service - February 2024",
          issueDate: new Date(2024, 1, 20).toISOString(), // Feb 20, 2024
          dueDate: new Date(2024, 2, 20).toISOString(), // Mar 20, 2024
          status: "paid" as const,
          subtotal: 2500.0,
          tax: 250.0,
          total: 2750.0,
          lineItems: [
            {
              description: "Fiber installation",
              quantity: 1,
              unitPrice: 2000.0,
              total: 2000.0,
            },
            {
              description: "Monthly service",
              quantity: 1,
              unitPrice: 500.0,
              total: 500.0,
            },
          ],
          notes: "Fiber internet setup and first month service",
          paidDate: new Date(2024, 2, 15).toISOString(),
          createdBy: "system",
          updatedBy: "system",
        },

        // March 2024 - Parking Services
        {
          invoiceNumber: "INV-2024-003",
          propertyId: properties[2].id, // The Flour Market
          providerId: serviceProviders[2].id, // Parking Plus Services
          description: "Parking lot maintenance and security - March 2024",
          issueDate: new Date(2024, 2, 10).toISOString(), // Mar 10, 2024
          dueDate: new Date(2024, 3, 10).toISOString(), // Apr 10, 2024
          status: "paid" as const,
          subtotal: 1800.0,
          tax: 180.0,
          total: 1980.0,
          lineItems: [
            {
              description: "Parking lot cleaning",
              quantity: 1,
              unitPrice: 600.0,
              total: 600.0,
            },
            {
              description: "Security monitoring",
              quantity: 30,
              unitPrice: 40.0,
              total: 1200.0,
            },
          ],
          notes: "Monthly parking services for March",
          paidDate: new Date(2024, 3, 5).toISOString(),
          createdBy: "system",
          updatedBy: "system",
        },

        // April 2024 - Cleaning Services
        {
          invoiceNumber: "INV-2024-004",
          propertyId: properties[0].id, // Knysna Mall
          providerId: serviceProviders[0].id, // CleanPro Services
          description: "Deep cleaning and maintenance - April 2024",
          issueDate: new Date(2024, 3, 5).toISOString(), // Apr 5, 2024
          dueDate: new Date(2024, 4, 5).toISOString(), // May 5, 2024
          status: "sent" as const,
          subtotal: 1500.0,
          tax: 150.0,
          total: 1650.0,
          lineItems: [
            {
              description: "Deep cleaning",
              quantity: 1,
              unitPrice: 1000.0,
              total: 1000.0,
            },
            {
              description: "Carpet cleaning",
              quantity: 1,
              unitPrice: 500.0,
              total: 500.0,
            },
          ],
          notes: "Quarterly deep cleaning service",
          createdBy: "system",
          updatedBy: "system",
        },

        // May 2024 - Fiber Internet
        {
          invoiceNumber: "INV-2024-005",
          propertyId: properties[1].id, // Cavendish Close
          providerId: serviceProviders[1].id, // FiberNet Solutions
          description: "Monthly fiber internet service - May 2024",
          issueDate: new Date(2024, 4, 15).toISOString(), // May 15, 2024
          dueDate: new Date(2024, 5, 15).toISOString(), // Jun 15, 2024
          status: "paid" as const,
          subtotal: 500.0,
          tax: 50.0,
          total: 550.0,
          lineItems: [
            {
              description: "Monthly fiber service",
              quantity: 1,
              unitPrice: 500.0,
              total: 500.0,
            },
          ],
          notes: "Monthly fiber internet service",
          paidDate: new Date(2024, 5, 10).toISOString(),
          createdBy: "system",
          updatedBy: "system",
        },

        // June 2024 - Parking Services
        {
          invoiceNumber: "INV-2024-006",
          propertyId: properties[2].id, // The Flour Market
          providerId: serviceProviders[2].id, // Parking Plus Services
          description: "Parking lot maintenance - June 2024",
          issueDate: new Date(2024, 5, 20).toISOString(), // Jun 20, 2024
          dueDate: new Date(2024, 6, 20).toISOString(), // Jul 20, 2024
          status: "overdue" as const,
          subtotal: 1600.0,
          tax: 160.0,
          total: 1760.0,
          lineItems: [
            {
              description: "Parking lot maintenance",
              quantity: 1,
              unitPrice: 1000.0,
              total: 1000.0,
            },
            {
              description: "Security services",
              quantity: 30,
              unitPrice: 20.0,
              total: 600.0,
            },
          ],
          notes: "Monthly parking services for June",
          createdBy: "system",
          updatedBy: "system",
        },

        // July 2024 - Cleaning Services
        {
          invoiceNumber: "INV-2024-007",
          propertyId: properties[0].id, // Knysna Mall
          providerId: serviceProviders[0].id, // CleanPro Services
          description: "Monthly cleaning services - July 2024",
          issueDate: new Date(2024, 6, 10).toISOString(), // Jul 10, 2024
          dueDate: new Date(2024, 7, 10).toISOString(), // Aug 10, 2024
          status: "draft" as const,
          subtotal: 1200.0,
          tax: 120.0,
          total: 1320.0,
          lineItems: [
            {
              description: "General cleaning",
              quantity: 1,
              unitPrice: 800.0,
              total: 800.0,
            },
            {
              description: "Window cleaning",
              quantity: 1,
              unitPrice: 400.0,
              total: 400.0,
            },
          ],
          notes: "Monthly cleaning services for July",
          createdBy: "system",
          updatedBy: "system",
        },

        // August 2024 - Fiber Internet
        {
          invoiceNumber: "INV-2024-008",
          propertyId: properties[1].id, // Cavendish Close
          providerId: serviceProviders[1].id, // FiberNet Solutions
          description: "Monthly fiber internet service - August 2024",
          issueDate: new Date(2024, 7, 15).toISOString(), // Aug 15, 2024
          dueDate: new Date(2024, 8, 15).toISOString(), // Sep 15, 2024
          status: "sent" as const,
          subtotal: 500.0,
          tax: 50.0,
          total: 550.0,
          lineItems: [
            {
              description: "Monthly fiber service",
              quantity: 1,
              unitPrice: 500.0,
              total: 500.0,
            },
          ],
          notes: "Monthly fiber internet service",
          createdBy: "system",
          updatedBy: "system",
        },

        // September 2024 - Parking Services
        {
          invoiceNumber: "INV-2024-009",
          propertyId: properties[2].id, // The Flour Market
          providerId: serviceProviders[2].id, // Parking Plus Services
          description: "Parking lot maintenance - September 2024",
          issueDate: new Date(2024, 8, 5).toISOString(), // Sep 5, 2024
          dueDate: new Date(2024, 9, 5).toISOString(), // Oct 5, 2024
          status: "paid" as const,
          subtotal: 1800.0,
          tax: 180.0,
          total: 1980.0,
          lineItems: [
            {
              description: "Parking lot cleaning",
              quantity: 1,
              unitPrice: 600.0,
              total: 600.0,
            },
            {
              description: "Security monitoring",
              quantity: 30,
              unitPrice: 40.0,
              total: 1200.0,
            },
          ],
          notes: "Monthly parking services for September",
          paidDate: new Date(2024, 9, 1).toISOString(),
          createdBy: "system",
          updatedBy: "system",
        },

        // October 2024 - Cleaning Services
        {
          invoiceNumber: "INV-2024-010",
          propertyId: properties[0].id, // Knysna Mall
          providerId: serviceProviders[0].id, // CleanPro Services
          description: "Monthly cleaning services - October 2024",
          issueDate: new Date(2024, 9, 20).toISOString(), // Oct 20, 2024
          dueDate: new Date(2024, 10, 20).toISOString(), // Nov 20, 2024
          status: "paid" as const,
          subtotal: 1200.0,
          tax: 120.0,
          total: 1320.0,
          lineItems: [
            {
              description: "General cleaning",
              quantity: 1,
              unitPrice: 800.0,
              total: 800.0,
            },
            {
              description: "Window cleaning",
              quantity: 1,
              unitPrice: 400.0,
              total: 400.0,
            },
          ],
          notes: "Monthly cleaning services for October",
          paidDate: new Date(2024, 10, 15).toISOString(),
          createdBy: "system",
          updatedBy: "system",
        },

        // November 2024 - Fiber Internet
        {
          invoiceNumber: "INV-2024-011",
          propertyId: properties[1].id, // Cavendish Close
          providerId: serviceProviders[1].id, // FiberNet Solutions
          description: "Monthly fiber internet service - November 2024",
          issueDate: new Date(2024, 10, 15).toISOString(), // Nov 15, 2024
          dueDate: new Date(2024, 11, 15).toISOString(), // Dec 15, 2024
          status: "overdue" as const,
          subtotal: 500.0,
          tax: 50.0,
          total: 550.0,
          lineItems: [
            {
              description: "Monthly fiber service",
              quantity: 1,
              unitPrice: 500.0,
              total: 500.0,
            },
          ],
          notes: "Monthly fiber internet service",
          createdBy: "system",
          updatedBy: "system",
        },

        // December 2024 - Parking Services
        {
          invoiceNumber: "INV-2024-012",
          propertyId: properties[2].id, // The Flour Market
          providerId: serviceProviders[2].id, // Parking Plus Services
          description: "Parking lot maintenance - December 2024",
          issueDate: new Date(2024, 11, 10).toISOString(), // Dec 10, 2024
          dueDate: new Date(2025, 0, 10).toISOString(), // Jan 10, 2025
          status: "sent" as const,
          subtotal: 2000.0,
          tax: 200.0,
          total: 2200.0,
          lineItems: [
            {
              description: "Parking lot maintenance",
              quantity: 1,
              unitPrice: 1200.0,
              total: 1200.0,
            },
            {
              description: "Security services",
              quantity: 30,
              unitPrice: 26.67,
              total: 800.0,
            },
          ],
          notes: "Monthly parking services for December",
          createdBy: "system",
          updatedBy: "system",
        },
      ];

      // Add all invoices to Firestore
      const batch = writeBatch(db);
      const invoiceRefs: any[] = [];

      for (const invoiceData of testData) {
        const invoiceRef = doc(collection(db, this.COLLECTION_NAME));
        batch.set(invoiceRef, {
          ...invoiceData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        invoiceRefs.push(invoiceRef);
      }

      await batch.commit();

      console.log(
        `✅ Successfully seeded ${testData.length} comprehensive test invoices`
      );
      console.log("📊 Test data includes:");
      console.log("   - 12 months of invoices (Jan-Dec 2024)");
      console.log("   - 3 service providers with REAL names:");
      console.log(
        `     • ${serviceProviders[0].name} (${serviceProviders[0].id})`
      );
      console.log(
        `     • ${serviceProviders[1].name} (${serviceProviders[1].id})`
      );
      console.log(
        `     • ${serviceProviders[2].name} (${serviceProviders[2].id})`
      );
      console.log("   - 3 properties with REAL names:");
      console.log(`     • ${properties[0].name} (${properties[0].id})`);
      console.log(`     • ${properties[1].name} (${properties[1].id})`);
      console.log(`     • ${properties[2].name} (${properties[2].id})`);
      console.log("   - Various statuses: paid, sent, overdue, draft");
      console.log("   - Total value: $19,420 across all invoices");
      console.log("🔗 All invoices now properly linked to real entities!");

      return { success: true, count: testData.length };
    } catch (error) {
      console.error("❌ Error seeding comprehensive test data:", error);
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create real service providers for testing
   */
  private static async createServiceProviders(): Promise<any[]> {
    try {
      // Check if providers already exist
      const existingProviders = await getDocs(
        collection(db, "serviceProviders")
      );
      let providersToReturn: any[] = [];

      if (!existingProviders.empty) {
        console.log("✅ Service providers already exist, using existing ones");
        providersToReturn = existingProviders.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(
          `🔍 Found ${providersToReturn.length} existing service providers`
        );
      }

      // If we don't have enough providers, create more
      if (providersToReturn.length < 3) {
        console.log(
          `🏗️ Need ${3 - providersToReturn.length} more service providers`
        );

        const additionalProviders = [
          {
            name: "CleanPro Services",
            email: "info@cleanpro.com",
            phone: "+1-555-0101",
            service: "Cleaning Services",
            status: "active" as const,
            rating: 4.8,
            propertyIds: [],
            serviceCategories: [
              "General Cleaning",
              "Window Cleaning",
              "Deep Cleaning",
            ],
            serviceAreas: ["Downtown", "Midtown", "Uptown"],
            businessName: "CleanPro Services LLC",
            complianceStatus: {
              backgroundCheck: true,
              drugTest: true,
              safetyTraining: true,
              lastUpdated: new Date().toISOString(),
            },
          },
          {
            name: "FiberNet Solutions",
            email: "support@fibernet.com",
            phone: "+1-555-0102",
            service: "Internet Services",
            status: "active" as const,
            rating: 4.9,
            propertyIds: [],
            serviceCategories: [
              "Fiber Installation",
              "Internet Service",
              "Network Maintenance",
            ],
            serviceAreas: ["Downtown", "Midtown", "Uptown"],
            businessName: "FiberNet Solutions Inc",
            complianceStatus: {
              backgroundCheck: true,
              drugTest: false,
              safetyTraining: true,
              lastUpdated: new Date().toISOString(),
            },
          },
          {
            name: "Parking Plus Services",
            email: "info@parkingplus.com",
            phone: "+1-555-0103",
            service: "Parking Services",
            status: "active" as const,
            rating: 4.7,
            propertyIds: [],
            serviceCategories: [
              "Parking Maintenance",
              "Security Services",
              "Lot Cleaning",
            ],
            serviceAreas: ["Downtown", "Midtown", "Uptown"],
            businessName: "Parking Plus Services LLC",
            complianceStatus: {
              backgroundCheck: true,
              drugTest: true,
              safetyTraining: true,
              lastUpdated: new Date().toISOString(),
            },
          },
        ];

        const batch = writeBatch(db);
        const providerRefs: any[] = [];

        for (const providerData of additionalProviders) {
          const providerRef = doc(collection(db, "serviceProviders"));
          batch.set(providerRef, {
            ...providerData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            createdBy: "system",
            updatedBy: "system",
          });
          providerRefs.push(providerRef);
        }

        try {
          await batch.commit();
          console.log("✅ Batch commit successful");
        } catch (commitError) {
          console.error("❌ Batch commit failed:", commitError);
          throw new Error(`Failed to commit service providers: ${commitError}`);
        }

        console.log("✅ Created additional service providers");

        // Add the new providers to our return array
        const newProviders = additionalProviders.map((providerData, index) => ({
          id: providerRefs[index].id,
          ...providerData,
        }));

        providersToReturn = [...providersToReturn, ...newProviders];
        console.log(
          `🔍 Total service providers now: ${providersToReturn.length}`
        );
      }

      // Ensure we have exactly 3 providers for the seeding
      if (providersToReturn.length >= 3) {
        console.log("✅ Have sufficient service providers for seeding");
        return providersToReturn.slice(0, 3); // Return exactly 3
      } else {
        throw new Error(
          `Failed to ensure 3 service providers. Only have ${providersToReturn.length}`
        );
      }
    } catch (error) {
      console.error("❌ Error creating service providers:", error);
      throw error;
    }
  }

  /**
   * Create real properties for testing
   */
  private static async createProperties(): Promise<any[]> {
    try {
      // Check if properties already exist
      const existingProperties = await getDocs(collection(db, "properties"));
      let propertiesToReturn: any[] = [];

      if (!existingProperties.empty) {
        console.log("✅ Properties already exist, using existing ones");
        propertiesToReturn = existingProperties.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(
          `🔍 Found ${propertiesToReturn.length} existing properties`
        );
      }

      // If we don't have enough properties, create more
      if (propertiesToReturn.length < 3) {
        console.log(`🏗️ Need ${3 - propertiesToReturn.length} more properties`);

        const additionalProperties = [
          {
            name: "Cavendish Close",
            tenantId: "tenant_2",
            address: "Cavendish Close, Cape Town, Western Cape, South Africa",
            status: "active" as const,
          },
          {
            name: "The Flour Market",
            tenantId: "tenant_3",
            address: "The Flour Market, Johannesburg, Gauteng, South Africa",
            status: "active" as const,
          },
        ];

        const batch = writeBatch(db);
        const propertyRefs: any[] = [];

        for (const propertyData of additionalProperties) {
          const propertyRef = doc(collection(db, "properties"));
          batch.set(propertyRef, {
            ...propertyData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          propertyRefs.push(propertyRef);
        }

        try {
          await batch.commit();
          console.log("✅ Batch commit successful");
        } catch (commitError) {
          console.error("❌ Batch commit failed:", commitError);
          throw new Error(`Failed to commit properties: ${commitError}`);
        }

        console.log("✅ Created additional properties");

        // Add the new properties to our return array
        const newProperties = additionalProperties.map(
          (propertyData, index) => ({
            id: propertyRefs[index].id,
            ...propertyData,
          })
        );

        propertiesToReturn = [...propertiesToReturn, ...newProperties];
        console.log(`🔍 Total properties now: ${propertiesToReturn.length}`);
      }

      // Ensure we have exactly 3 properties for the seeding
      if (propertiesToReturn.length >= 3) {
        console.log("✅ Have sufficient properties for seeding");
        return propertiesToReturn.slice(0, 3); // Return exactly 3
      } else {
        throw new Error(
          `Failed to ensure 3 properties. Only have ${propertiesToReturn.length}`
        );
      }
    } catch (error) {
      console.error("❌ Error creating properties:", error);
      throw error;
    }
  }

  /**
   * Create a new invoice with security validation
   */
  static async createInvoice(
    invoiceData: InvoiceCreateRequest,
    userId: string
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    try {
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        return {
          success: false,
          error:
            "Firebase connection unavailable. Please check your internet connection and try again.",
        };
      }

      // Validate user permissions (only admins can create invoices)
      const hasPermission = await SecurityUtils.validateProviderAccess(
        "",
        userId,
        "write"
      );
      if (!hasPermission) {
        return {
          success: false,
          error: "Insufficient permissions to create invoices",
        };
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Sanitize data
      const sanitizedData = SecurityUtils.sanitizeData(invoiceData);

      // Prepare data for storage
      const invoiceToStore = {
        ...sanitizedData,
        invoiceNumber,
        status: "draft" as const,
        issueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,
        updatedBy: userId,
      };

      // Add to Firestore
      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        invoiceToStore
      );

      console.log("✅ Invoice created successfully:", docRef.id);
      return { success: true, invoiceId: docRef.id };
    } catch (error: any) {
      console.error("❌ Error creating invoice:", error);
      return {
        success: false,
        error: error.message || "Failed to create invoice",
      };
    }
  }

  /**
   * Get an invoice by ID
   */
  static async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, invoiceId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
        } as Invoice;
      }

      return null;
    } catch (error) {
      console.error("Error fetching invoice:", error);
      return null;
    }
  }

  /**
   * Get all invoices with optional filtering
   */
  static async getInvoices(
    searchParams: InvoiceSearchParams = {}
  ): Promise<Invoice[]> {
    try {
      let q: any = collection(db, this.COLLECTION_NAME);

      // Apply filters
      if (searchParams.status) {
        q = query(q, where("status", "==", searchParams.status));
      }

      if (searchParams.providerId) {
        q = query(q, where("providerId", "==", searchParams.providerId));
      }

      if (searchParams.propertyId) {
        q = query(q, where("propertyId", "==", searchParams.propertyId));
      }

      if (searchParams.dateFrom) {
        q = query(q, where("dueDate", ">=", searchParams.dateFrom));
      }

      if (searchParams.dateTo) {
        q = query(q, where("dueDate", "<=", searchParams.dateTo));
      }

      // Apply ordering
      q = query(q, orderBy("createdAt", "desc"));

      // Apply limit
      if (searchParams.limit) {
        q = query(q, limit(searchParams.limit));
      }

      const querySnapshot = await getDocs(q);
      const invoices: Invoice[] = [];

      querySnapshot.forEach((doc: any) => {
        invoices.push({
          id: doc.id,
          ...doc.data(),
        } as Invoice);
      });

      return invoices;
    } catch (error) {
      console.error("Error fetching invoices:", error);
      return [];
    }
  }

  /**
   * Search invoices by text
   */
  static async searchInvoices(searchTerm: string): Promise<Invoice[]> {
    try {
      // Get all invoices and filter by search term
      const invoices = await this.getInvoices();

      return invoices.filter(
        (invoice) =>
          invoice.invoiceNumber
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          invoice.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          invoice.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error("Error searching invoices:", error);
      return [];
    }
  }

  /**
   * Update an invoice
   */
  static async updateInvoice(
    invoiceId: string,
    updateData: InvoiceUpdateRequest,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        return {
          success: false,
          error:
            "Firebase connection unavailable. Please check your internet connection and try again.",
        };
      }

      // Validate user permissions
      const hasPermission = await SecurityUtils.validateProviderAccess(
        invoiceId,
        userId,
        "write"
      );
      if (!hasPermission) {
        return {
          success: false,
          error: "Insufficient permissions to update this invoice",
        };
      }

      // Sanitize update data
      const sanitizedData = SecurityUtils.sanitizeData(updateData);

      // Add update metadata
      const updatePayload = {
        ...sanitizedData,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };

      // Update in Firestore
      const docRef = doc(db, this.COLLECTION_NAME, invoiceId);
      await updateDoc(docRef, updatePayload);

      console.log("✅ Invoice updated successfully:", invoiceId);
      return { success: true };
    } catch (error: any) {
      console.error("❌ Error updating invoice:", error);
      return {
        success: false,
        error: error.message || "Failed to update invoice",
      };
    }
  }

  /**
   * Delete an invoice (soft delete by setting status to cancelled)
   */
  static async deleteInvoice(
    invoiceId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        return {
          success: false,
          error:
            "Firebase connection unavailable. Please check your internet connection and try again.",
        };
      }

      // Validate user permissions
      const hasPermission = await SecurityUtils.validateProviderAccess(
        invoiceId,
        userId,
        "delete"
      );
      if (!hasPermission) {
        return {
          success: false,
          error: "Insufficient permissions to delete this invoice",
        };
      }

      // Soft delete by setting status to cancelled
      const docRef = doc(db, this.COLLECTION_NAME, invoiceId);
      await updateDoc(docRef, {
        status: "cancelled",
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      console.log("✅ Invoice deleted successfully (soft delete):", invoiceId);
      return { success: true };
    } catch (error: any) {
      console.error("❌ Error deleting invoice:", error);
      return {
        success: false,
        error: error.message || "Failed to delete invoice",
      };
    }
  }

  /**
   * Get invoice statistics
   */
  static async getInvoiceStats(): Promise<{
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    cancelled: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  }> {
    try {
      const invoices = await this.getInvoices();

      const stats = {
        total: invoices.length,
        draft: invoices.filter((i) => i.status === "draft").length,
        sent: invoices.filter((i) => i.status === "sent").length,
        paid: invoices.filter((i) => i.status === "paid").length,
        overdue: invoices.filter((i) => i.status === "overdue").length,
        cancelled: invoices.filter((i) => i.status === "cancelled").length,
        totalAmount: invoices.reduce((sum, i) => sum + i.total, 0),
        paidAmount: invoices
          .filter((i) => i.status === "paid")
          .reduce((sum, i) => sum + i.total, 0),
        pendingAmount: invoices
          .filter((i) => ["draft", "sent", "overdue"].includes(i.status))
          .reduce((sum, i) => sum + i.total, 0),
        overdueAmount: invoices
          .filter((i) => i.status === "overdue")
          .reduce((sum, i) => sum + i.total, 0),
      };

      return stats;
    } catch (error) {
      console.error("Error fetching invoice stats:", error);
      return {
        total: 0,
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
      };
    }
  }

  /**
   * Get pending invoices count for dashboard
   */
  static async getPendingInvoicesCount(): Promise<number> {
    try {
      const invoices = await this.getInvoices();
      return invoices.filter((i) =>
        ["draft", "sent", "overdue"].includes(i.status)
      ).length;
    } catch (error) {
      console.error("Error fetching pending invoices count:", error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time invoice updates
   */
  static subscribeToInvoices(
    callback: (invoices: Invoice[]) => void,
    searchParams: InvoiceSearchParams = {}
  ): Unsubscribe {
    try {
      let q: any = collection(db, this.COLLECTION_NAME);

      // Apply filters
      if (searchParams.status) {
        q = query(q, where("status", "==", searchParams.status));
      }

      if (searchParams.providerId) {
        q = query(q, where("providerId", "==", searchParams.providerId));
      }

      if (searchParams.propertyId) {
        q = query(q, where("propertyId", "==", searchParams.propertyId));
      }

      // Apply ordering
      q = query(q, orderBy("createdAt", "desc"));

      // Apply limit
      if (searchParams.limit) {
        q = query(q, limit(searchParams.limit));
      }

      return onSnapshot(q, (querySnapshot: any) => {
        const invoices: Invoice[] = [];
        querySnapshot.forEach((doc: any) => {
          invoices.push({
            id: doc.id,
            ...doc.data(),
          } as Invoice);
        });
        callback(invoices);
      });
    } catch (error) {
      console.error("Error setting up invoice subscription:", error);
      // Return a no-op function
      return () => {};
    }
  }
}

import { db } from "./firebaseConfig";
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
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { Invoice } from "../types/float34";
import { auth } from "./firebaseConfig";

export class InvoiceService {
  private static COLLECTION_NAME = "invoices";

  /**
   * Check Firebase connection
   */
  static async checkFirebaseConnection(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("❌ No authenticated user");
        return false;
      }

      // Try to query the invoices collection
      const q = query(collection(db, this.COLLECTION_NAME), limit(1));
      await getDocs(q);
      console.log("✅ Firebase connection successful");
      return true;
    } catch (error) {
      console.error("❌ Firebase connection failed:", error);
      return false;
    }
  }

  /**
   * Get all invoices
   */
  static async getInvoices(): Promise<Invoice[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      return querySnapshot.docs.map(
        (doc: QueryDocumentSnapshot<unknown, DocumentData>) => ({
          id: doc.id,
          ...(doc.data() as Omit<Invoice, "id">),
        })
      ) as Invoice[];
    } catch (error) {
      console.error("Error getting invoices:", error);
      return [];
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...(docSnap.data() as Omit<Invoice, "id">),
        } as Invoice;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error getting invoice:", error);
      return null;
    }
  }

  /**
   * Get invoices by property ID
   */
  static async getInvoicesByProperty(propertyId: string): Promise<Invoice[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("propertyId", "==", propertyId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(
        (doc: QueryDocumentSnapshot<unknown, DocumentData>) => ({
          id: doc.id,
          ...(doc.data() as Omit<Invoice, "id">),
        })
      ) as Invoice[];
    } catch (error) {
      console.error("Error getting invoices by property:", error);
      return [];
    }
  }

  /**
   * Get invoices by provider ID
   */
  static async getInvoicesByProvider(providerId: string): Promise<Invoice[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("providerId", "==", providerId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(
        (doc: QueryDocumentSnapshot<unknown, DocumentData>) => ({
          id: doc.id,
          ...(doc.data() as Omit<Invoice, "id">),
        })
      ) as Invoice[];
    } catch (error) {
      console.error("Error getting invoices by provider:", error);
      return [];
    }
  }

  /**
   * Get invoices by property and provider combination
   */
  static async getInvoicesByPropertyAndProvider(
    propertyId: string,
    providerId: string
  ): Promise<Invoice[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("propertyId", "==", propertyId),
        where("providerId", "==", providerId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(
        (doc: QueryDocumentSnapshot<unknown, DocumentData>) => ({
          id: doc.id,
          ...(doc.data() as Omit<Invoice, "id">),
        })
      ) as Invoice[];
    } catch (error) {
      console.error("Error getting invoices by property and provider:", error);
      return [];
    }
  }

  /**
   * Create new invoice
   */
  static async createInvoice(
    invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...invoiceData,
        createdAt: now,
        updatedAt: now,
      });

      console.log("✅ Invoice created with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error creating invoice:", error);
      throw error;
    }
  }

  /**
   * Update invoice
   */
  static async updateInvoice(
    id: string,
    updates: Partial<Invoice>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      console.log("✅ Invoice updated:", id);
    } catch (error) {
      console.error("Error updating invoice:", error);
      throw error;
    }
  }

  /**
   * Delete invoice
   */
  static async deleteInvoice(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(docRef);

      console.log("✅ Invoice deleted:", id);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      throw error;
    }
  }

  /**
   * Seed sample invoices with consistent IDs
   */
  static async seedSampleInvoices(): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> {
    try {
      console.log("🌱 Seeding invoices with consistent data...");

      // Check if we already have invoices
      const existingInvoices = await this.getInvoices();
      if (existingInvoices && existingInvoices.length > 0) {
        console.log("✅ Invoices already exist, skipping seed");
        return { success: true, count: existingInvoices.length };
      }

      // Sample data for realistic invoices with consistent IDs
      const sampleData = [
        {
          invoiceNumber: "INV-2024-001",
          propertyId: "prop_knysna_mall",
          providerId: "prov_parking_plus",
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
          currency: "USD",
          lineItems: [
            {
              description: "Parking lot cleaning",
              quantity: 1,
              unitPrice: 500.0,
              total: 500.0,
              category: "Cleaning",
              notes: "Monthly deep cleaning service",
            },
            {
              description: "Security monitoring",
              quantity: 30,
              unitPrice: 25.0,
              total: 750.0,
              category: "Security",
              notes: "Daily security patrols",
            },
          ],
          notes: "Services provided for January 2024",
          terms: "Net 30",
          paymentInstructions: "Please pay within 30 days",
          paidDate: new Date(
            Date.now() - 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
          paymentMethod: "Bank Transfer",
          paymentReference: "REF-2024-001",
          tags: ["parking", "security", "monthly"],
          category: "Maintenance",
          priority: "medium" as const,
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-002",
          propertyId: "prop_flour_market",
          providerId: "prov_cleanpro_services",
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
          currency: "USD",
          lineItems: [
            {
              description: "Deep cleaning service",
              quantity: 1,
              unitPrice: 600.0,
              total: 600.0,
              category: "Cleaning",
              notes: "Comprehensive cleaning of all areas",
            },
            {
              description: "Sanitization supplies",
              quantity: 1,
              unitPrice: 200.0,
              total: 200.0,
              category: "Supplies",
              notes: "EPA-approved sanitizers",
            },
          ],
          notes: "Monthly deep cleaning service",
          terms: "Net 30",
          paymentInstructions: "Please pay within 30 days",
          paidDate: new Date(
            Date.now() - 18 * 24 * 60 * 60 * 1000
          ).toISOString(),
          paymentMethod: "Check",
          paymentReference: "REF-2024-002",
          tags: ["cleaning", "sanitization", "monthly"],
          category: "Cleaning",
          priority: "medium" as const,
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-003",
          propertyId: "prop_cavendish_center",
          providerId: "prov_fibernet_solutions",
          description: "Internet service and network maintenance",
          issueDate: new Date(
            Date.now() - 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: "sent" as const,
          subtotal: 1500.0,
          tax: 150.0,
          total: 1650.0,
          currency: "USD",
          lineItems: [
            {
              description: "Monthly internet service",
              quantity: 1,
              unitPrice: 1200.0,
              total: 1200.0,
              category: "Internet",
              notes: "1Gbps fiber connection",
            },
            {
              description: "Network maintenance",
              quantity: 1,
              unitPrice: 300.0,
              total: 300.0,
              category: "Maintenance",
              notes: "Monthly network health check",
            },
          ],
          notes: "Monthly internet and network services",
          terms: "Net 15",
          paymentInstructions: "Please pay within 15 days",
          tags: ["internet", "network", "monthly"],
          category: "Technology",
          priority: "high" as const,
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-004",
          propertyId: "prop_flour_market",
          providerId: "prov_parking_plus",
          description: "Parking lot maintenance and security",
          issueDate: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: "paid" as const,
          subtotal: 1200.0,
          tax: 120.0,
          total: 1320.0,
          currency: "USD",
          lineItems: [
            {
              description: "Parking lot cleaning",
              quantity: 1,
              unitPrice: 800.0,
              total: 800.0,
              category: "Cleaning",
              notes: "Monthly parking lot maintenance",
            },
            {
              description: "Security monitoring",
              quantity: 1,
              unitPrice: 400.0,
              total: 400.0,
              category: "Security",
              notes: "24/7 security monitoring",
            },
          ],
          notes: "Monthly parking services",
          terms: "Net 30",
          paymentInstructions: "Please pay within 30 days",
          paidDate: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000
          ).toISOString(),
          paymentMethod: "Bank Transfer",
          paymentReference: "REF-2024-004",
          tags: ["parking", "security", "monthly"],
          category: "Maintenance",
          priority: "medium" as const,
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-005",
          propertyId: "prop_cavendish_center",
          providerId: "prov_fibernet_solutions",
          description: "Internet service and network maintenance",
          issueDate: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() + 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "paid" as const,
          subtotal: 550.0,
          tax: 55.0,
          total: 605.0,
          currency: "USD",
          lineItems: [
            {
              description: "Monthly internet service",
              quantity: 1,
              unitPrice: 500.0,
              total: 500.0,
              category: "Internet",
              notes: "500Mbps fiber connection",
            },
            {
              description: "Network maintenance",
              quantity: 1,
              unitPrice: 50.0,
              total: 50.0,
              category: "Maintenance",
              notes: "Monthly network health check",
            },
          ],
          notes: "Monthly internet and network services",
          terms: "Net 15",
          paymentInstructions: "Please pay within 15 days",
          paidDate: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000
          ).toISOString(),
          paymentMethod: "Bank Transfer",
          paymentReference: "REF-2024-005",
          tags: ["internet", "network", "monthly"],
          category: "Technology",
          priority: "medium" as const,
          createdBy: "system",
          updatedBy: "system",
        },
        {
          invoiceNumber: "INV-2024-006",
          propertyId: "prop_flour_market",
          providerId: "prov_cleanpro_services",
          description: "General cleaning and maintenance",
          issueDate: new Date(
            Date.now() - 8 * 24 * 60 * 60 * 1000
          ).toISOString(),
          dueDate: new Date(
            Date.now() + 22 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "overdue" as const,
          subtotal: 450.0,
          tax: 45.0,
          total: 495.0,
          currency: "USD",
          lineItems: [
            {
              description: "General cleaning service",
              quantity: 1,
              unitPrice: 300.0,
              total: 300.0,
              category: "Cleaning",
              notes: "Weekly cleaning service",
            },
            {
              description: "Maintenance supplies",
              quantity: 1,
              unitPrice: 150.0,
              total: 150.0,
              category: "Supplies",
              notes: "Cleaning supplies and equipment",
            },
          ],
          notes: "Weekly cleaning service",
          terms: "Net 30",
          paymentInstructions: "Please pay within 30 days",
          tags: ["cleaning", "maintenance", "weekly"],
          category: "Cleaning",
          priority: "low" as const,
          createdBy: "system",
          updatedBy: "system",
        },
      ];

      // Create invoices
      const batch = writeBatch(db);
      const createdInvoices = [];

      for (const invoiceData of sampleData) {
        const docRef = doc(collection(db, this.COLLECTION_NAME));
        batch.set(docRef, invoiceData);
        createdInvoices.push(invoiceData.invoiceNumber);
      }

      await batch.commit();
      console.log("✅ Successfully seeded invoices:", createdInvoices);

      return { success: true, count: createdInvoices.length };
    } catch (error: any) {
      console.error("❌ Error seeding invoices:", error);
      return { success: false, count: 0, error: error.message };
    }
  }

  /**
   * Get invoice statistics for financial reporting
   */
  static async getInvoiceStats(): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    overdueAmount: number;
    sentAmount: number;
    draftAmount: number;
    paidCount: number;
    overdueCount: number;
    sentCount: number;
    draftCount: number;
  }> {
    try {
      const invoices = await this.getInvoices();

      const stats = {
        totalInvoices: invoices.length,
        totalAmount: 0,
        paidAmount: 0,
        overdueAmount: 0,
        sentAmount: 0,
        draftAmount: 0,
        paidCount: 0,
        overdueCount: 0,
        sentCount: 0,
        draftCount: 0,
      };

      invoices.forEach((invoice) => {
        stats.totalAmount += invoice.total;

        switch (invoice.status) {
          case "paid":
            stats.paidAmount += invoice.total;
            stats.paidCount++;
            break;
          case "overdue":
            stats.overdueAmount += invoice.total;
            stats.overdueCount++;
            break;
          case "sent":
            stats.sentAmount += invoice.total;
            stats.sentCount++;
            break;
          case "draft":
            stats.draftAmount += invoice.total;
            stats.draftCount++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error("Error getting invoice stats:", error);
      return {
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        overdueAmount: 0,
        sentAmount: 0,
        draftAmount: 0,
        paidCount: 0,
        overdueCount: 0,
        sentCount: 0,
        draftCount: 0,
      };
    }
  }
}

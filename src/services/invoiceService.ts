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
      let q = collection(db, this.COLLECTION_NAME);

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

      querySnapshot.forEach((doc) => {
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
      let q = collection(db, this.COLLECTION_NAME);

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

      return onSnapshot(q, (querySnapshot) => {
        const invoices: Invoice[] = [];
        querySnapshot.forEach((doc) => {
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

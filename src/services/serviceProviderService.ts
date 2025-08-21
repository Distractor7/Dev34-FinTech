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
import {
  Provider,
  ServiceProviderCreateRequest,
  ServiceProviderUpdateRequest,
  ServiceProviderSearchParams,
} from "@/types/float34";

export class ServiceProviderService {
  private static readonly COLLECTION_NAME = "serviceProviders";
  private static readonly BATCH_SIZE = 20;

  /**
   * Check if Firebase is available and connected
   */
  private static async checkFirebaseConnection(): Promise<boolean> {
    try {
      // Check if user is authenticated first
      const { auth } = await import("./firebaseConfig");
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.warn(
          "⚠️ Firebase connection check failed: User not authenticated"
        );
        return false;
      }

      // Try to access the serviceProviders collection instead of a non-existent _health collection
      // This will test both connection and permissions
      const testQuery = query(collection(db, this.COLLECTION_NAME), limit(1));
      await getDocs(testQuery);
      return true;
    } catch (error: any) {
      if (
        error.code === "permission-denied" ||
        error.message?.includes("permission-denied")
      ) {
        console.warn(
          "⚠️ Firebase connection check failed: Missing or insufficient permissions"
        );
      } else if (
        error.code === "unauthenticated" ||
        error.message?.includes("unauthenticated")
      ) {
        console.warn(
          "⚠️ Firebase connection check failed: User not authenticated"
        );
      } else {
        console.warn("⚠️ Firebase connection check failed:", error);
      }
      return false;
    }
  }

  /**
   * Create a new service provider with security validation and encryption
   */
  static async createProvider(
    providerData: ServiceProviderCreateRequest,
    userId: string
  ): Promise<{ success: boolean; providerId?: string; error?: string }> {
    try {
      // Check Firebase connection first
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
        "",
        userId,
        "write"
      );
      if (!hasPermission) {
        return {
          success: false,
          error: "Insufficient permissions to create service providers",
        };
      }

      // Validate data structure
      const validation = SecurityUtils.validateProviderData(providerData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        };
      }

      // Sanitize data
      const sanitizedData = SecurityUtils.sanitizeData(providerData);

      // Prepare data for storage
      const providerToStore = {
        ...sanitizedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        createdBy: userId,
        updatedBy: userId,
        // Ensure required fields have defaults
        serviceCategories: sanitizedData.serviceCategories || [],
        serviceAreas: sanitizedData.serviceAreas || [],
        tags: sanitizedData.tags || [],
        complianceStatus: {
          backgroundCheck: false,
          drugTest: false,
          safetyTraining: false,
          lastUpdated: new Date().toISOString(),
          ...sanitizedData.complianceStatus,
        },
        availability: {
          monday: { start: "09:00", end: "17:00", available: true },
          tuesday: { start: "09:00", end: "17:00", available: true },
          wednesday: { start: "09:00", end: "17:00", available: true },
          thursday: { start: "09:00", end: "17:00", available: true },
          friday: { start: "09:00", end: "17:00", available: true },
          saturday: { start: "09:00", end: "17:00", available: false },
          sunday: { start: "09:00", end: "17:00", available: false },
          ...sanitizedData.availability,
        },
      };

      // Encrypt sensitive data
      const encryptedData = DataEncryption.encryptProviderData(providerToStore);

      // Store in Firestore
      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        encryptedData
      );

      return { success: true, providerId: docRef.id };
    } catch (error) {
      console.error("Error creating service provider:", error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("permission-denied")) {
          return {
            success: false,
            error:
              "Permission denied. Please check your authentication status.",
          };
        } else if (error.message.includes("unavailable")) {
          return {
            success: false,
            error: "Firebase service unavailable. Please try again later.",
          };
        } else if (error.message.includes("network")) {
          return {
            success: false,
            error: "Network error. Please check your internet connection.",
          };
        }
      }

      return {
        success: false,
        error: "Failed to create service provider. Please try again.",
      };
    }
  }

  /**
   * Get a service provider by ID with decryption
   */
  static async getProviderById(providerId: string): Promise<Provider | null> {
    try {
      // Check Firebase connection first
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        console.warn("Firebase connection unavailable, cannot fetch provider");
        return null;
      }

      const docRef = doc(db, this.COLLECTION_NAME, providerId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      // Decrypt sensitive data
      const decryptedData = DataEncryption.decryptProviderData(data);

      return {
        id: docSnap.id,
        ...decryptedData,
      } as Provider;
    } catch (error) {
      console.error("Error fetching service provider:", error);
      return null;
    }
  }

  /**
   * Get all service providers with pagination and search
   */
  static async getProviders(
    params: ServiceProviderSearchParams = {},
    lastDoc?: QueryDocumentSnapshot<unknown, DocumentData>,
    pageSize: number = this.BATCH_SIZE
  ): Promise<{
    providers: Provider[];
    lastDoc?: QueryDocumentSnapshot<unknown, DocumentData>;
    hasMore: boolean;
  }> {
    try {
      console.log("🔍 getProviders called with params:", params);

      // Check Firebase connection first
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        console.warn(
          "Firebase connection unavailable, returning empty results"
        );
        return { providers: [], hasMore: false };
      }

      let q: any = collection(db, this.COLLECTION_NAME);

      // Build query based on search parameters
      // IMPORTANT: Limit to 2 where clauses to avoid complex composite indexes
      const constraints: any[] = [];
      let hasComplexQuery = false;

      // Priority 1: Status filter (most common)
      if (params.status) {
        constraints.push(where("status", "==", params.status));
      }

      // Priority 2: Service filter
      if (params.service && constraints.length < 2) {
        constraints.push(where("service", "==", params.service));
      }

      // Priority 3: Rating filter (if we still have room)
      if (params.rating && constraints.length < 2) {
        constraints.push(where("rating", ">=", params.rating));
      }

      // Note: serviceCategories array query requires special indexing
      // We'll filter this in memory to avoid complex composite indexes
      if (params.serviceCategories && params.serviceCategories.length > 0) {
        hasComplexQuery = true;
      }

      // Add ordering - always order by name for consistency
      constraints.push(orderBy("name", "asc"));

      // Add pagination
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      // Add limit
      constraints.push(limit(pageSize));

      // Apply constraints to query
      let finalQuery = q;
      if (constraints.length > 0) {
        finalQuery = query(q, ...constraints);
      }

      const querySnapshot = await getDocs(finalQuery);
      const providers: Provider[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Decrypt sensitive data
        const decryptedData = DataEncryption.decryptProviderData(data);

        // Apply in-memory filtering for complex queries
        if (hasComplexQuery && params.serviceCategories) {
          const hasMatchingCategory = params.serviceCategories.some(
            (category) => decryptedData.serviceCategories?.includes(category)
          );
          if (!hasMatchingCategory) return;
        }

        providers.push({
          id: doc.id,
          ...decryptedData,
        } as Provider);
      });

      return {
        providers,
        lastDoc:
          querySnapshot.docs.length > 0
            ? querySnapshot.docs[querySnapshot.docs.length - 1]
            : undefined,
        hasMore: querySnapshot.docs.length === pageSize,
      };
    } catch (error: any) {
      console.error("❌ Error fetching service providers:", error);

      // Handle specific Firebase errors
      if (
        error.code === "permission-denied" ||
        error.message?.includes("permission-denied")
      ) {
        console.error(
          "❌ Permission denied: User doesn't have access to service providers"
        );
        throw new Error(
          "You don't have permission to access service providers. Please contact your administrator."
        );
      } else if (
        error.code === "unauthenticated" ||
        error.message?.includes("unauthenticated")
      ) {
        console.error("❌ User not authenticated");
        throw new Error("Please log in to access service providers.");
      } else if (error.code === "resource-exhausted") {
        console.error("❌ Firestore quota exceeded");
        throw new Error(
          "Service temporarily unavailable due to high demand. Please try again later."
        );
      } else {
        console.error("❌ Unexpected error:", error);
        throw new Error(
          "Failed to load service providers. Please try again later."
        );
      }
    }
  }

  /**
   * Search service providers by text query
   */
  static async searchProviders(
    searchQuery: string,
    lastDoc?: QueryDocumentSnapshot<unknown, DocumentData>,
    pageSize: number = this.BATCH_SIZE
  ): Promise<{
    providers: Provider[];
    lastDoc?: QueryDocumentSnapshot<unknown, DocumentData>;
    hasMore: boolean;
  }> {
    try {
      // Use a simple query with just ordering to avoid complex indexes
      // We'll do the text search filtering in memory
      const {
        providers,
        lastDoc: fetchedLastDoc,
        hasMore,
      } = await this.getProviders({}, lastDoc, pageSize * 2);

      // Apply text search filtering in memory
      const filteredProviders = providers.filter(
        (provider) =>
          provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          provider.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
          provider.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          provider.businessName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          provider.serviceCategories.some((cat) =>
            cat.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );

      return {
        providers: filteredProviders.slice(0, pageSize),
        lastDoc: fetchedLastDoc,
        hasMore: hasMore || filteredProviders.length > pageSize,
      };
    } catch (error) {
      console.error("Error searching service providers:", error);

      // Handle specific Firestore indexing errors
      if (error instanceof Error) {
        if (error.message.includes("indexes?create_composite=")) {
          console.error(
            "❌ Firestore composite index required for search. Please create the required indexes in Firebase Console."
          );
        }
      }

      return { providers: [], hasMore: false };
    }
  }

  /**
   * Update a service provider with security validation
   */
  static async updateProvider(
    providerId: string,
    updateData: ServiceProviderUpdateRequest,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate user permissions
      const hasPermission = await SecurityUtils.validateProviderAccess(
        providerId,
        userId,
        "write"
      );
      if (!hasPermission) {
        return {
          success: false,
          error: "Insufficient permissions to update this service provider",
        };
      }

      // Validate data structure
      const validation = SecurityUtils.validateProviderData(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        };
      }

      // Sanitize data
      const sanitizedData = SecurityUtils.sanitizeData(updateData);

      // Prepare update data
      const dataToUpdate = {
        ...sanitizedData,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };

      // Encrypt sensitive data
      const encryptedData = DataEncryption.encryptProviderData(dataToUpdate);

      // Update in Firestore
      const docRef = doc(db, this.COLLECTION_NAME, providerId);
      await updateDoc(docRef, encryptedData);

      return { success: true };
    } catch (error) {
      console.error("Error updating service provider:", error);
      return { success: false, error: "Failed to update service provider" };
    }
  }

  /**
   * Delete a service provider with security validation
   */
  static async deleteProvider(
    providerId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate user permissions
      const hasPermission = await SecurityUtils.validateProviderAccess(
        providerId,
        userId,
        "delete"
      );
      if (!hasPermission) {
        return {
          success: false,
          error: "Insufficient permissions to delete this service provider",
        };
      }

      // Soft delete - mark as inactive instead of hard delete
      const docRef = doc(db, this.COLLECTION_NAME, providerId);
      await updateDoc(docRef, {
        status: "suspended",
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      return { success: true };
    } catch (error) {
      console.error("Error deleting service provider:", error);
      return { success: false, error: "Failed to delete service provider" };
    }
  }

  /**
   * Bulk update service providers
   */
  static async bulkUpdateProviders(
    updates: Array<{ id: string; data: ServiceProviderUpdateRequest }>,
    userId: string
  ): Promise<{
    success: boolean;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    try {
      const batch = writeBatch(db);
      const results: Array<{ id: string; success: boolean; error?: string }> =
        [];

      for (const update of updates) {
        try {
          // Validate permissions for each provider
          const hasPermission = await SecurityUtils.validateProviderAccess(
            update.id,
            userId,
            "write"
          );
          if (!hasPermission) {
            results.push({
              id: update.id,
              success: false,
              error: "Insufficient permissions",
            });
            continue;
          }

          // Validate and sanitize data
          const validation = SecurityUtils.validateProviderData(update.data);
          if (!validation.isValid) {
            results.push({
              id: update.id,
              success: false,
              error: `Validation failed: ${validation.errors.join(", ")}`,
            });
            continue;
          }

          const sanitizedData = SecurityUtils.sanitizeData(update.data);
          const dataToUpdate = {
            ...sanitizedData,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
          };

          const encryptedData =
            DataEncryption.encryptProviderData(dataToUpdate);
          const docRef = doc(db, this.COLLECTION_NAME, update.id);
          batch.update(docRef, encryptedData);

          results.push({ id: update.id, success: true });
        } catch (error) {
          results.push({
            id: update.id,
            success: false,
            error: "Update failed",
          });
        }
      }

      await batch.commit();
      return { success: true, results };
    } catch (error) {
      console.error("Error in bulk update:", error);
      return { success: false, results: [] };
    }
  }

  /**
   * Get real-time updates for service providers
   */
  static subscribeToProviders(
    callback: (providers: Provider[]) => void,
    params: ServiceProviderSearchParams = {}
  ): Unsubscribe {
    try {
      let q: any = collection(db, this.COLLECTION_NAME);
      const constraints: any[] = [];

      if (params.status) {
        constraints.push(where("status", "==", params.status));
      }

      constraints.push(orderBy("name", "asc"));

      return onSnapshot(query(q, ...constraints), (querySnapshot) => {
        const providers: Provider[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const decryptedData = DataEncryption.decryptProviderData(data);

          providers.push({
            id: doc.id,
            ...decryptedData,
          } as Provider);
        });

        callback(providers);
      });
    } catch (error) {
      console.error("Error setting up provider subscription:", error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Get service provider statistics
   */
  static async getProviderStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    suspended: number;
  }> {
    try {
      const q = collection(db, this.COLLECTION_NAME);
      const querySnapshot = await getDocs(q);

      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
        suspended: 0,
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        stats.total++;
        const status = data.status as keyof typeof stats;
        if (status && status in stats) {
          stats[status]++;
        }
      });

      return stats;
    } catch (error) {
      console.error("Error fetching provider stats:", error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
        suspended: 0,
      };
    }
  }

  /**
   * Seed service providers with proper data for analytics testing
   * This ensures all service providers have names and required fields
   */
  static async seedServiceProviders(): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> {
    try {
      console.log("🌱 Seeding service providers with proper data...");

      // Check if we already have properly seeded providers
      const existingProviders = await this.getProviders();
      if (
        existingProviders?.providers &&
        existingProviders.providers.length > 0
      ) {
        const hasNames = existingProviders.providers.every(
          (p) => p.name && p.name.trim() !== ""
        );
        if (hasNames) {
          console.log("✅ Service providers already have names, skipping seed");
          return { success: true, count: existingProviders.providers.length };
        }
      }

      // Define the service providers with comprehensive schema
      const serviceProvidersData = [
        {
          id: "prov_cleanpro_services",
          name: "CleanPro Services",
          email: "info@cleanpro.com",
          phone: "+1-555-0101",
          service: "Cleaning Services",
          status: "active" as const,
          rating: 4.8,
          propertyIds: [
            "prop_flour_market",
            "prop_cavendish_center",
            "prop_knysna_mall",
          ],

          // Business Information
          businessName: "CleanPro Services LLC",
          taxId: "TAX-123456789",
          businessAddress: {
            street: "100 Cleaning Lane",
            city: "Downtown",
            state: "CA",
            zipCode: "90210",
            country: "USA",
          },
          businessLicense: "LIC-2024-001",
          insuranceInfo: {
            provider: "Secure Insurance Co",
            policyNumber: "POL-2024-001",
            expiryDate: "2025-12-31",
            coverageAmount: 1000000,
          },

          // Service Details
          serviceCategories: [
            "General Cleaning",
            "Window Cleaning",
            "Deep Cleaning",
            "Sanitization",
            "Post-Construction Cleanup",
          ],
          serviceAreas: ["Downtown", "Midtown", "Uptown"],

          // Availability
          availability: {
            monday: { start: "08:00", end: "17:00" },
            tuesday: { start: "08:00", end: "17:00" },
            wednesday: { start: "08:00", end: "17:00" },
            thursday: { start: "08:00", end: "17:00" },
            friday: { start: "08:00", end: "17:00" },
            saturday: { start: "09:00", end: "15:00" },
            sunday: { start: null, end: null },
          },

          // Financial Details
          financialDetails: {
            taxRate: 8.25,
            currency: "USD",
            paymentTerms: 30,
          },

          // Performance Metrics
          performanceMetrics: {
            responseTime: 2,
            completionRate: 98,
            customerSatisfaction: 4.8,
            onTimeDelivery: 95,
          },

          // Compliance Status
          complianceStatus: {
            backgroundCheck: true,
            drugTest: true,
            safetyTraining: true,
            lastUpdated: new Date().toISOString(),
          },
        },
        {
          id: "prov_fibernet_solutions",
          name: "FiberNet Solutions",
          email: "support@fibernet.com",
          phone: "+1-555-0102",
          service: "Internet Services",
          status: "active" as const,
          rating: 4.9,
          propertyIds: ["prop_cavendish_center", "prop_knysna_mall"],

          // Business Information
          businessName: "FiberNet Solutions Inc",
          taxId: "TAX-987654321",
          businessAddress: {
            street: "200 Tech Drive",
            city: "Midtown",
            state: "CA",
            zipCode: "90211",
            country: "USA",
          },
          businessLicense: "LIC-2024-002",
          insuranceInfo: {
            provider: "Tech Insurance Co",
            policyNumber: "POL-2024-002",
            expiryDate: "2025-12-31",
            coverageAmount: 2000000,
          },

          // Service Details
          serviceCategories: [
            "Fiber Installation",
            "Internet Service",
            "Network Maintenance",
            "WiFi Setup",
            "Security Systems",
          ],
          serviceAreas: ["Downtown", "Midtown", "Uptown"],

          // Availability
          availability: {
            monday: { start: "09:00", end: "18:00" },
            tuesday: { start: "09:00", end: "18:00" },
            wednesday: { start: "09:00", end: "18:00" },
            thursday: { start: "09:00", end: "18:00" },
            friday: { start: "09:00", end: "18:00" },
            saturday: { start: "10:00", end: "16:00" },
            sunday: { start: null, end: null },
          },

          // Financial Details
          financialDetails: {
            taxRate: 8.25,
            currency: "USD",
            paymentTerms: 15,
          },

          // Performance Metrics
          performanceMetrics: {
            responseTime: 1,
            completionRate: 99,
            customerSatisfaction: 4.9,
            onTimeDelivery: 98,
          },

          // Compliance Status
          complianceStatus: {
            backgroundCheck: true,
            drugTest: false,
            safetyTraining: true,
            lastUpdated: new Date().toISOString(),
          },
        },
        {
          id: "prov_parking_plus",
          name: "Parking Plus Services",
          email: "info@parkingplus.com",
          phone: "+1-555-0103",
          service: "Parking Services",
          status: "active" as const,
          rating: 4.7,
          propertyIds: ["prop_flour_market", "prop_knysna_mall"],

          // Business Information
          businessName: "Parking Plus Services LLC",
          taxId: "TAX-456789123",
          businessAddress: {
            street: "300 Parking Way",
            city: "Uptown",
            state: "CA",
            zipCode: "90212",
            country: "USA",
          },
          businessLicense: "LIC-2024-003",
          insuranceInfo: {
            provider: "Parking Insurance Co",
            policyNumber: "POL-2024-003",
            expiryDate: "2025-12-31",
            coverageAmount: 1500000,
          },

          // Service Details
          serviceCategories: [
            "Parking Maintenance",
            "Security Services",
            "Lot Cleaning",
            "Valet Services",
            "Traffic Management",
          ],
          serviceAreas: ["Downtown", "Midtown", "Uptown"],

          // Availability
          availability: {
            monday: { start: "08:00", end: "17:00" },
            tuesday: { start: "08:00", end: "17:00" },
            wednesday: { start: "08:00", end: "17:00" },
            thursday: { start: "08:00", end: "17:00" },
            friday: { start: "08:00", end: "17:00" },
            saturday: { start: null, end: null },
            sunday: { start: null, end: null },
          },

          // Financial Details
          financialDetails: {
            taxRate: 8.25,
            currency: "USD",
            paymentTerms: 30,
          },

          // Performance Metrics
          performanceMetrics: {
            responseTime: 3,
            completionRate: 96,
            customerSatisfaction: 4.7,
            onTimeDelivery: 92,
          },

          // Compliance Status
          complianceStatus: {
            backgroundCheck: true,
            drugTest: true,
            safetyTraining: true,
            lastUpdated: new Date().toISOString(),
          },
        },
      ];

      // Get existing provider documents to update them
      const existingProviderDocs = await getDocs(
        collection(db, "serviceProviders")
      );
      const batch = writeBatch(db);
      let updatedCount = 0;

      if (!existingProviderDocs.empty) {
        // Update existing providers with proper data
        existingProviderDocs.docs.forEach((doc, index) => {
          if (index < serviceProvidersData.length) {
            const providerData = serviceProvidersData[index];
            batch.update(doc.ref, {
              ...providerData,
              updatedAt: new Date().toISOString(),
              updatedBy: "system",
            });
            updatedCount++;
          }
        });
      } else {
        // Create new providers if none exist
        serviceProvidersData.forEach((providerData) => {
          const docRef = doc(collection(db, "serviceProviders"));
          batch.set(docRef, {
            ...providerData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            createdBy: "system",
            updatedBy: "system",
          });
          updatedCount++;
        });
      }

      await batch.commit();
      console.log(
        `✅ Successfully seeded ${updatedCount} service providers with proper data`
      );

      return { success: true, count: updatedCount };
    } catch (error) {
      console.error("❌ Error seeding service providers:", error);
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Master seeding function - seeds properties, service providers, and invoices
   * Call this function to ensure all data is consistent
   */
  static async seedAllData(): Promise<{
    success: boolean;
    propertiesCount: number;
    providersCount: number;
    invoicesCount: number;
    error?: string;
  }> {
    try {
      console.log("🌱 Starting master data seeding...");

      // Import services
      const { PropertyService } = await import("./propertyService");
      const { InvoiceService } = await import("./invoiceService");

      // Step 1: Seed properties first
      console.log("🌱 Step 1: Seeding properties...");
      const propertiesResult = await PropertyService.seedProperties();
      if (!propertiesResult.success) {
        throw new Error(`Failed to seed properties: ${propertiesResult.error}`);
      }

      // Step 2: Seed service providers
      console.log("🌱 Step 2: Seeding service providers...");
      const providersResult = await this.seedServiceProviders();
      if (!providersResult.success) {
        throw new Error(
          `Failed to seed service providers: ${providersResult.error}`
        );
      }

      // Step 3: Seed invoices
      console.log("🌱 Step 3: Seeding invoices...");
      const invoicesResult = await InvoiceService.seedSampleInvoices();
      if (!invoicesResult.success) {
        throw new Error(`Failed to seed invoices: ${invoicesResult.error}`);
      }

      console.log("✅ Master data seeding completed successfully!");
      return {
        success: true,
        propertiesCount: propertiesResult.count,
        providersCount: providersResult.count,
        invoicesCount: invoicesResult.count,
      };
    } catch (error: any) {
      console.error("❌ Error in master data seeding:", error);
      return {
        success: false,
        propertiesCount: 0,
        providersCount: 0,
        invoicesCount: 0,
        error: error.message,
      };
    }
  }
}

export default ServiceProviderService;

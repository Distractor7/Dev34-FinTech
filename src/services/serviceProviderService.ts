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
      // Try to access Firestore to check connection
      await getDocs(collection(db, "_health"));
      return true;
    } catch (error) {
      console.warn("⚠️ Firebase connection check failed:", error);
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
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    pageSize: number = this.BATCH_SIZE
  ): Promise<{
    providers: Provider[];
    lastDoc?: QueryDocumentSnapshot<DocumentData>;
    hasMore: boolean;
  }> {
    try {
      // Check Firebase connection first
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        console.warn(
          "Firebase connection unavailable, returning empty results"
        );
        return { providers: [], hasMore: false };
      }

      let q = collection(db, this.COLLECTION_NAME);

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

      constraints.push(limit(pageSize + 1)); // Get one extra to check if there are more

      const querySnapshot = await getDocs(query(q, ...constraints));
      const providers: Provider[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Decrypt sensitive data
        const decryptedData = DataEncryption.decryptProviderData(data);

        providers.push({
          id: doc.id,
          ...decryptedData,
        } as Provider);
      });

      // Apply additional filters in memory to avoid complex indexes
      let filteredProviders = providers;

      if (
        hasComplexQuery &&
        params.serviceCategories &&
        params.serviceCategories.length > 0
      ) {
        filteredProviders = providers.filter((provider) =>
          provider.serviceCategories.some((cat) =>
            params.serviceCategories!.includes(cat)
          )
        );
      }

      // Check if there are more documents
      const hasMore = filteredProviders.length > pageSize;
      if (hasMore) {
        filteredProviders.pop(); // Remove the extra document
      }

      const lastVisible =
        filteredProviders.length > 0
          ? querySnapshot.docs[querySnapshot.docs.length - 1]
          : undefined;

      return {
        providers: filteredProviders,
        lastDoc: lastVisible,
        hasMore,
      };
    } catch (error) {
      console.error("Error fetching service providers:", error);

      // Handle specific Firestore indexing errors
      if (error instanceof Error) {
        if (error.message.includes("indexes?create_composite=")) {
          console.error(
            "❌ Firestore composite index required. Please create the required indexes in Firebase Console."
          );
          console.error(
            "💡 Index creation URL:",
            error.message.match(/indexes\?create_composite=[^&\s]+/)?.[0]
          );
        } else if (error.message.includes("permission-denied")) {
          console.error(
            "❌ Permission denied. Check your Firestore rules and authentication."
          );
        } else if (error.message.includes("unavailable")) {
          console.error(
            "❌ Firestore service unavailable. Please try again later."
          );
        }
      }

      return { providers: [], hasMore: false };
    }
  }

  /**
   * Search service providers by text query
   */
  static async searchProviders(
    searchQuery: string,
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    pageSize: number = this.BATCH_SIZE
  ): Promise<{
    providers: Provider[];
    lastDoc?: QueryDocumentSnapshot<DocumentData>;
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
      let q = collection(db, this.COLLECTION_NAME);
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
}

export default ServiceProviderService;

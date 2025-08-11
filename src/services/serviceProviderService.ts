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
   * Create a new service provider with security validation and encryption
   */
  static async createProvider(
    providerData: ServiceProviderCreateRequest,
    userId: string
  ): Promise<{ success: boolean; providerId?: string; error?: string }> {
    try {
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
      return { success: false, error: "Failed to create service provider" };
    }
  }

  /**
   * Get a service provider by ID with decryption
   */
  static async getProviderById(providerId: string): Promise<Provider | null> {
    try {
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
      let q = collection(db, this.COLLECTION_NAME);

      // Build query based on search parameters
      const constraints: any[] = [];

      if (params.status) {
        constraints.push(where("status", "==", params.status));
      }

      if (params.service) {
        constraints.push(where("service", "==", params.service));
      }

      if (params.serviceCategories && params.serviceCategories.length > 0) {
        constraints.push(
          where(
            "serviceCategories",
            "array-contains-any",
            params.serviceCategories
          )
        );
      }

      if (params.rating) {
        constraints.push(where("rating", ">=", params.rating));
      }

      if (params.complianceStatus !== undefined) {
        constraints.push(
          where(
            "complianceStatus.backgroundCheck",
            "==",
            params.complianceStatus
          )
        );
      }

      // Add ordering
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

      // Check if there are more documents
      const hasMore = providers.length > pageSize;
      if (hasMore) {
        providers.pop(); // Remove the extra document
      }

      const lastVisible =
        providers.length > 0
          ? querySnapshot.docs[querySnapshot.docs.length - 1]
          : undefined;

      return {
        providers,
        lastDoc: lastVisible,
        hasMore,
      };
    } catch (error) {
      console.error("Error fetching service providers:", error);
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
      // For text search, we'll need to implement a more sophisticated approach
      // For now, we'll search in memory after fetching
      const {
        providers,
        lastDoc: fetchedLastDoc,
        hasMore,
      } = await this.getProviders({}, lastDoc, pageSize * 2);

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
        stats[data.status]++;
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

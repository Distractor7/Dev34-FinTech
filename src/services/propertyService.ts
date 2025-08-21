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
import { Property } from "@/types/float34";

export interface PropertyCreateRequest {
  tenantId: string;
  name: string;
  address: string;
  status: "active" | "inactive" | "maintenance";
  propertyType?: string;
  squareFootage?: number;
  yearBuilt?: number;
  description?: string;
  amenities?: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    manager?: string;
  };
  financialInfo?: {
    purchasePrice?: number;
    currentValue?: number;
    monthlyRent?: number;
    propertyTax?: number;
    insurance?: number;
  };
}

export interface PropertyUpdateRequest {
  name?: string;
  address?: string;
  status?: "active" | "inactive" | "maintenance";
  propertyType?: string;
  squareFootage?: number;
  yearBuilt?: number;
  description?: string;
  amenities?: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    manager?: string;
  };
  financialInfo?: {
    purchasePrice?: number;
    currentValue?: number;
    monthlyRent?: number;
    propertyTax?: number;
    insurance?: number;
  };
}

export interface PropertySearchParams {
  status?: string;
  propertyType?: string;
  tenantId?: string;
  searchTerm?: string;
  limit?: number;
}

export class PropertyService {
  private static readonly COLLECTION_NAME = "properties";
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
   * Create a new property with security validation
   */
  static async createProperty(
    propertyData: PropertyCreateRequest,
    userId: string
  ): Promise<{ success: boolean; propertyId?: string; error?: string }> {
    try {
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        return {
          success: false,
          error:
            "Firebase connection unavailable. Please check your internet connection and try again.",
        };
      }

      // Validate user permissions (only admins can create properties)
      const hasPermission = await SecurityUtils.validateProviderAccess(
        "",
        userId,
        "write"
      );
      if (!hasPermission) {
        return {
          success: false,
          error: "Insufficient permissions to create properties",
        };
      }

      // Sanitize data
      const sanitizedData = SecurityUtils.sanitizeData(propertyData);

      // Prepare data for storage
      const propertyToStore = {
        ...sanitizedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,
        updatedBy: userId,
        // Ensure required fields have defaults
        amenities: sanitizedData.amenities || [],
        status: sanitizedData.status || "active",
      };

      // Add to Firestore
      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        propertyToStore
      );

      console.log("✅ Property created successfully:", docRef.id);
      return { success: true, propertyId: docRef.id };
    } catch (error: any) {
      console.error("❌ Error creating property:", error);
      return {
        success: false,
        error: error.message || "Failed to create property",
      };
    }
  }

  /**
   * Get a property by ID
   */
  static async getPropertyById(propertyId: string): Promise<Property | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, propertyId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
        } as Property;
      }

      return null;
    } catch (error) {
      console.error("Error fetching property:", error);
      return null;
    }
  }

  /**
   * Get all properties with optional filtering
   */
  static async getProperties(
    searchParams: PropertySearchParams = {}
  ): Promise<Property[]> {
    try {
      let q = collection(db, this.COLLECTION_NAME);

      // Apply filters
      if (searchParams.status) {
        q = query(q, where("status", "==", searchParams.status));
      }

      if (searchParams.tenantId) {
        q = query(q, where("tenantId", "==", searchParams.tenantId));
      }

      if (searchParams.propertyType) {
        q = query(q, where("propertyType", "==", searchParams.propertyType));
      }

      // Apply ordering
      q = query(q, orderBy("createdAt", "desc"));

      // Apply limit
      if (searchParams.limit) {
        q = query(q, limit(searchParams.limit));
      }

      const querySnapshot = await getDocs(q);
      const properties: Property[] = [];

      querySnapshot.forEach((doc) => {
        properties.push({
          id: doc.id,
          ...doc.data(),
        } as Property);
      });

      return properties;
    } catch (error) {
      console.error("Error fetching properties:", error);
      return [];
    }
  }

  /**
   * Search properties by text
   */
  static async searchProperties(searchTerm: string): Promise<Property[]> {
    try {
      // Get all properties and filter by search term
      const properties = await this.getProperties();

      return properties.filter(
        (property) =>
          property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (property.description &&
            property.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    } catch (error) {
      console.error("Error searching properties:", error);
      return [];
    }
  }

  /**
   * Update a property
   */
  static async updateProperty(
    propertyId: string,
    updateData: PropertyUpdateRequest,
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
        propertyId,
        userId,
        "write"
      );
      if (!hasPermission) {
        return {
          success: false,
          error: "Insufficient permissions to update this property",
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
      const docRef = doc(db, this.COLLECTION_NAME, propertyId);
      await updateDoc(docRef, updatePayload);

      console.log("✅ Property updated successfully:", propertyId);
      return { success: true };
    } catch (error: any) {
      console.error("❌ Error updating property:", error);
      return {
        success: false,
        error: error.message || "Failed to update property",
      };
    }
  }

  /**
   * Delete a property (soft delete by setting status to inactive)
   */
  static async deleteProperty(
    propertyId: string,
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
        propertyId,
        userId,
        "delete"
      );
      if (!hasPermission) {
        return {
          success: false,
          error: "Insufficient permissions to delete this property",
        };
      }

      // Soft delete by setting status to inactive
      const docRef = doc(db, this.COLLECTION_NAME, propertyId);
      await updateDoc(docRef, {
        status: "inactive",
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      console.log(
        "✅ Property deleted successfully (soft delete):",
        propertyId
      );
      return { success: true };
    } catch (error: any) {
      console.error("❌ Error deleting property:", error);
      return {
        success: false,
        error: error.message || "Failed to delete property",
      };
    }
  }

  /**
   * Bulk update properties
   */
  static async bulkUpdateProperties(
    propertyIds: string[],
    updateData: PropertyUpdateRequest,
    userId: string
  ): Promise<{ success: boolean; updatedCount: number; errors: string[] }> {
    try {
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        return {
          success: false,
          updatedCount: 0,
          errors: ["Firebase connection unavailable"],
        };
      }

      const batch = writeBatch(db);
      let updatedCount = 0;
      const errors: string[] = [];

      for (const propertyId of propertyIds) {
        try {
          // Validate permissions for each property
          const hasPermission = await SecurityUtils.validateProviderAccess(
            propertyId,
            userId,
            "write"
          );

          if (!hasPermission) {
            errors.push(`Insufficient permissions for property ${propertyId}`);
            continue;
          }

          const docRef = doc(db, this.COLLECTION_NAME, propertyId);
          const updatePayload = {
            ...updateData,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
          };

          batch.update(docRef, updatePayload);
          updatedCount++;
        } catch (error: any) {
          errors.push(
            `Failed to update property ${propertyId}: ${error.message}`
          );
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        console.log(
          `✅ Bulk update completed: ${updatedCount} properties updated`
        );
      }

      return {
        success: updatedCount > 0,
        updatedCount,
        errors,
      };
    } catch (error: any) {
      console.error("❌ Error in bulk update:", error);
      return {
        success: false,
        updatedCount: 0,
        errors: [error.message || "Bulk update failed"],
      };
    }
  }

  /**
   * Subscribe to real-time property updates
   */
  static subscribeToProperties(
    callback: (properties: Property[]) => void,
    searchParams: PropertySearchParams = {}
  ): Unsubscribe {
    try {
      let q = collection(db, this.COLLECTION_NAME);

      // Apply filters
      if (searchParams.status) {
        q = query(q, where("status", "==", searchParams.status));
      }

      if (searchParams.tenantId) {
        q = query(q, where("tenantId", "==", searchParams.tenantId));
      }

      // Apply ordering
      q = query(q, orderBy("createdAt", "desc"));

      // Apply limit
      if (searchParams.limit) {
        q = query(q, limit(searchParams.limit));
      }

      return onSnapshot(q, (querySnapshot) => {
        const properties: Property[] = [];
        querySnapshot.forEach((doc) => {
          properties.push({
            id: doc.id,
            ...doc.data(),
          } as Property);
        });
        callback(properties);
      });
    } catch (error) {
      console.error("Error setting up property subscription:", error);
      // Return a no-op function
      return () => {};
    }
  }

  /**
   * Get property statistics
   */
  static async getPropertyStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    byType: Record<string, number>;
  }> {
    try {
      const properties = await this.getProperties();

      const stats = {
        total: properties.length,
        active: properties.filter((p) => p.status === "active").length,
        inactive: properties.filter((p) => p.status === "inactive").length,
        maintenance: properties.filter((p) => p.status === "maintenance")
          .length,
        byType: {} as Record<string, number>,
      };

      // Count by property type
      properties.forEach((property) => {
        const type = property.propertyType || "Unknown";
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("Error fetching property stats:", error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        maintenance: 0,
        byType: {},
      };
    }
  }

  /**
   * Grant admin access to all properties for the current user
   * This is a temporary development method to ensure security rules work
   */
  static async grantAdminAccessToAll(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const isConnected = await this.checkFirebaseConnection();
      if (!isConnected) {
        return {
          success: false,
          error: "Firebase connection unavailable",
        };
      }

      // Get current user
      const { currentUser } = await import("firebase/auth");
      const user = currentUser();

      if (!user) {
        return {
          success: false,
          error: "No authenticated user",
        };
      }

      // Get all properties
      const properties = await this.getProperties();

      // Update user profile to have access to all properties
      const { UserService } = await import("./userService");
      const result = await UserService.createOrUpdateUserProfile(user.uid, {
        accessiblePropertyIds: properties.map((p) => p.id),
        role: "admin",
      });

      if (result.success) {
        console.log("✅ Admin access granted to all properties");
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to update user profile",
        };
      }
    } catch (error: any) {
      console.error("Error granting admin access:", error);
      return {
        success: false,
        error: error.message || "Failed to grant admin access",
      };
    }
  }

  /**
   * Seed sample properties for development
   */
  static async seedProperties(): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> {
    try {
      console.log("🌱 Seeding properties with consistent data...");

      // Check if we already have properties
      const existingProperties = await this.getProperties();
      if (existingProperties && existingProperties.length > 0) {
        console.log("✅ Properties already exist, skipping seed");
        return { success: true, count: existingProperties.length };
      }

      // Define properties with consistent IDs and comprehensive schema
      const propertiesData = [
        {
          id: "prop_flour_market",
          name: "The Flour Market",
          address: {
            street: "123 Main Street",
            city: "Downtown",
            state: "CA",
            zipCode: "90210",
            country: "USA",
            fullAddress: "123 Main Street, Downtown, CA 90210",
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
            tags: ["retail", "downtown", "historic", "high-traffic"],
            features: ["parking", "security", "storage"],
            restrictions: ["no-industrial", "business-hours-only"],
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
            fullAddress: "456 Business Avenue, Midtown, CA 90211",
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
            purchasePrice: 4500000,
            currentValue: 5800000,
            monthlyRent: 45000,
            propertyTax: 32000,
            insurance: 18000,
            monthlyExpenses: 12000,
          },
          location: {
            latitude: 34.0622,
            longitude: -118.2537,
            timezone: "America/Los_Angeles",
          },
          metadata: {
            tags: ["office", "midtown", "modern", "premium"],
            features: ["conference-rooms", "fitness-center", "elevator"],
            restrictions: ["business-only", "no-residential"],
          },
        },
        {
          id: "prop_knysna_mall",
          name: "Knysna Mall",
          address: {
            street: "789 Shopping Boulevard",
            city: "Uptown",
            state: "CA",
            zipCode: "90212",
            country: "USA",
            fullAddress: "789 Shopping Boulevard, Uptown, CA 90212",
          },
          status: "active" as const,
          propertyType: "Shopping Center",
          squareFootage: 35000,
          yearBuilt: 2010,
          description:
            "Large shopping mall with multiple retail spaces and entertainment options",
          amenities: [
            "Parking",
            "Security",
            "HVAC",
            "Food Court",
            "Entertainment",
            "Loading Zones",
            "Customer Service",
          ],
          contactInfo: {
            phone: "+1-555-0102",
            email: "management@knysnamall.com",
            manager: "Mike Davis",
            emergencyContact: "+1-555-9997",
          },
          financialInfo: {
            purchasePrice: 6500000,
            currentValue: 8200000,
            monthlyRent: 65000,
            propertyTax: 48000,
            insurance: 25000,
            monthlyExpenses: 18000,
          },
          location: {
            latitude: 34.0722,
            longitude: -118.2637,
            timezone: "America/Los_Angeles",
          },
          metadata: {
            tags: ["shopping", "uptown", "entertainment", "high-traffic"],
            features: ["food-court", "entertainment", "parking"],
            restrictions: ["retail-only", "no-industrial"],
          },
        },
      ];

      // Create properties
      const batch = writeBatch(db);
      const createdProperties = [];

      for (const propertyData of propertiesData) {
        const { id, ...data } = propertyData;
        const docRef = doc(db, this.COLLECTION_NAME, id);
        batch.set(docRef, {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "system",
          updatedBy: "system",
        });
        createdProperties.push(id);
      }

      await batch.commit();
      console.log("✅ Successfully seeded properties:", createdProperties);

      return { success: true, count: createdProperties.length };
    } catch (error) {
      console.error("❌ Error seeding properties:", error);
      return { success: false, error: error.message };
    }
  }
}

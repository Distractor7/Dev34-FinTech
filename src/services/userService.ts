import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "./firebaseConfig";

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "admin" | "service_provider" | "property_manager";
  status: "active" | "inactive" | "pending";
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
  profileCompleted: boolean;
  // Service provider specific fields
  providerId?: string;
  // Property manager specific fields
  managedProperties?: string[];
}

export class UserService {
  private static readonly COLLECTION_NAME = "users";

  /**
   * Create a new user profile
   */
  static async createUserProfile(
    userData: Omit<
      UserProfile,
      "uid" | "createdAt" | "updatedAt" | "lastLogin" | "profileCompleted"
    >
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      const userProfile: UserProfile = {
        ...userData,
        uid: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        profileCompleted: false,
      };

      await setDoc(doc(db, this.COLLECTION_NAME, user.uid), userProfile);

      return { success: true };
    } catch (error) {
      console.error("Error creating user profile:", error);
      return { success: false, error: "Failed to create user profile" };
    }
  }

  /**
   * Get user profile by UID
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as UserProfile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    uid: string,
    updates: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, uid);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating user profile:", error);
      return { success: false, error: "Failed to update user profile" };
    }
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, uid);
      await updateDoc(docRef, {
        lastLogin: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating last login:", error);
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("email", "==", email)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return querySnapshot.docs[0].data() as UserProfile;
    } catch (error) {
      console.error("Error fetching user by email:", error);
      return null;
    }
  }

  /**
   * Check if user profile exists
   */
  static async userProfileExists(uid: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(uid);
      return profile !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Complete user profile setup
   */
  static async completeProfileSetup(
    uid: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, uid);
      await updateDoc(docRef, {
        profileCompleted: true,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error completing profile setup:", error);
      return { success: false, error: "Failed to complete profile setup" };
    }
  }

  /**
   * Link service provider to user
   */
  static async linkServiceProvider(
    uid: string,
    providerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, uid);
      await updateDoc(docRef, {
        providerId,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error linking service provider:", error);
      return { success: false, error: "Failed to link service provider" };
    }
  }
}

export default UserService;

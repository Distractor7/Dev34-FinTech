import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration for Flow34 project
const firebaseConfig = {
  apiKey: "AIzaSyDQ-wTvan99kZal7EWXcve2RAQy966M0yk",
  authDomain: "flow34-bad8e.firebaseapp.com",
  projectId: "flow34-bad8e",
  storageBucket: "flow34-bad8e.firebasestorage.app",
  messagingSenderId: "256044292068",
  appId: "1:256044292068:web:5cd9a6ed0b207796fed9f1",
  measurementId: "G-CCJGHX5EQ4",
};

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  const missingFields = requiredFields.filter(
    (field) => !firebaseConfig[field as keyof typeof firebaseConfig]
  );

  if (missingFields.length > 0) {
    console.error(
      "❌ Firebase configuration is missing required fields:",
      missingFields
    );
    throw new Error(
      `Firebase configuration incomplete. Missing: ${missingFields.join(", ")}`
    );
  }

  console.log("✅ Firebase configuration validated successfully");
};

// Initialize Firebase
let app;
try {
  validateFirebaseConfig();
  app = initializeApp(firebaseConfig);
  console.log("🚀 Firebase initialized successfully for Flow34 project");
} catch (error) {
  console.error("❌ Failed to initialize Firebase:", error);
  throw error;
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Analytics only on client side and when supported
export const analytics =
  typeof window !== "undefined"
    ? (async () => {
        try {
          const analyticsSupported = await isSupported();
          if (analyticsSupported) {
            return getAnalytics(app);
          } else {
            console.log("📊 Analytics not supported in this environment");
            return null;
          }
        } catch (error) {
          console.warn("⚠️ Failed to initialize Analytics:", error);
          return null;
        }
      })()
    : null;

// Connect to emulators in development (DISABLED - using production Firebase)
// if (process.env.NODE_ENV === "development") {
//   try {
//     // Only connect to emulators if Firebase is properly configured
//     if (
//       firebaseConfig.apiKey &&
//       firebaseConfig.apiKey !== "your_actual_api_key_here"
//     ) {
//       connectAuthEmulator(auth, "http://localhost:9099");
//       connectFirestoreEmulator(db, "localhost", 8080);
//       connectStorageEmulator(storage, "localhost", 9199);
//       connectFunctionsEmulator(functions, "localhost", 5001);
//       console.log("🔌 Connected to Firebase emulators");
//     } else {
//       console.log("⚠️ Skipping emulator connection - using fallback config");
//     }
//   } catch (error) {
//     console.log("Emulators already connected or not available");
//   }
// }

console.log("🌐 Using production Firebase services (emulators disabled)");

// Encryption utilities for sensitive data
export class DataEncryption {
  private static readonly ENCRYPTION_KEY =
    process.env.NEXT_PUBLIC_ENCRYPTION_KEY ||
    "default-key-change-in-production";

  // Simple encryption for demo purposes - in production, use proper encryption libraries
  static encrypt(data: string): string {
    if (!data) return data;
    try {
      // In production, use proper encryption like AES-256-GCM
      return btoa(encodeURIComponent(data));
    } catch (error) {
      console.error("Encryption failed:", error);
      return data;
    }
  }

  static decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;
    try {
      // In production, use proper decryption
      return decodeURIComponent(atob(encryptedData));
    } catch (error) {
      console.error("Decryption failed:", error);
      return encryptedData;
    }
  }

  // Encrypt sensitive fields in service provider data
  static encryptProviderData(provider: any): any {
    const encrypted = { ...provider };

    // Encrypt sensitive fields
    if (encrypted.apiConnections) {
      Object.keys(encrypted.apiConnections).forEach((key) => {
        if (encrypted.apiConnections[key].apiKey) {
          encrypted.apiConnections[key].apiKey = this.encrypt(
            encrypted.apiConnections[key].apiKey
          );
        }
        if (encrypted.apiConnections[key].apiSecret) {
          encrypted.apiConnections[key].apiSecret = this.encrypt(
            encrypted.apiConnections[key].apiSecret
          );
        }
      });
    }

    if (encrypted.financialDetails?.bankAccount) {
      if (encrypted.financialDetails.bankAccount.accountNumber) {
        encrypted.financialDetails.bankAccount.accountNumber = this.encrypt(
          encrypted.financialDetails.bankAccount.accountNumber
        );
      }
      if (encrypted.financialDetails.bankAccount.routingNumber) {
        encrypted.financialDetails.bankAccount.routingNumber = this.encrypt(
          encrypted.financialDetails.bankAccount.routingNumber
        );
      }
    }

    return encrypted;
  }

  // Decrypt sensitive fields in service provider data
  static decryptProviderData(provider: any): any {
    const decrypted = { ...provider };

    // Decrypt sensitive fields
    if (decrypted.apiConnections) {
      Object.keys(decrypted.apiConnections).forEach((key) => {
        if (decrypted.apiConnections[key].apiKey) {
          decrypted.apiConnections[key].apiKey = this.decrypt(
            decrypted.apiConnections[key].apiKey
          );
        }
        if (decrypted.apiConnections[key].apiSecret) {
          decrypted.apiConnections[key].apiSecret = this.decrypt(
            decrypted.apiConnections[key].apiSecret
          );
        }
      });
    }

    if (decrypted.financialDetails?.bankAccount) {
      if (decrypted.financialDetails.bankAccount.accountNumber) {
        decrypted.financialDetails.bankAccount.accountNumber = this.decrypt(
          decrypted.financialDetails.bankAccount.accountNumber
        );
      }
      if (decrypted.financialDetails.bankAccount.routingNumber) {
        decrypted.financialDetails.bankAccount.routingNumber = this.decrypt(
          decrypted.financialDetails.bankAccount.routingNumber
        );
      }
    }

    return decrypted;
  }
}

// Security utilities
export class SecurityUtils {
  // Validate user permissions for service provider operations
  static async validateProviderAccess(
    providerId: string,
    userId: string,
    operation: "read" | "write" | "delete"
  ): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      // For new user signup, allow them to create their own profile
      if (operation === "write" && !providerId) {
        return true; // Allow new users to create profiles during signup
      }

      // Check if user has admin role
      const token = await user.getIdTokenResult();
      const isAdmin =
        token.claims?.role === "admin" || token.claims?.isAdmin === true;

      if (operation === "read") return true; // All authenticated users can read
      if (operation === "write" || operation === "delete") return isAdmin; // Only admins can write/delete

      return false;
    } catch (error) {
      console.error("Permission validation failed:", error);
      return false;
    }
  }

  // Sanitize data before storage
  static sanitizeData(data: any): any {
    if (typeof data !== "object" || data === null) return data;

    const sanitized = { ...data };

    // Remove potentially dangerous fields
    delete sanitized.__proto__;
    delete sanitized.constructor;

    // Sanitize nested objects
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  // Validate data structure
  static validateProviderData(data: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== "string") {
      errors.push("Name is required and must be a string");
    }

    if (!data.email || typeof data.email !== "string") {
      errors.push("Email is required and must be a string");
    }

    if (!data.service || typeof data.service !== "string") {
      errors.push("Service is required and must be a string");
    }

    if (
      !data.status ||
      !["active", "inactive", "pending", "suspended"].includes(data.status)
    ) {
      errors.push(
        "Status must be one of: active, inactive, pending, suspended"
      );
    }

    if (typeof data.rating !== "number" || data.rating < 0 || data.rating > 5) {
      errors.push("Rating must be a number between 0 and 5");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default app;

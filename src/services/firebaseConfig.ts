import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
    console.error(
      "Please check your .env.local file and ensure all Firebase configuration values are set."
    );
    console.error("Current config:", firebaseConfig);
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
  console.log("🚀 Firebase initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase:", error);

  // Fallback for development - you can remove this in production
  if (process.env.NODE_ENV === "development") {
    console.warn("⚠️ Using fallback Firebase config for development");
    const fallbackConfig = {
      apiKey: "demo-api-key",
      authDomain: "demo-project.firebaseapp.com",
      projectId: "demo-project",
      storageBucket: "demo-project.appspot.com",
      messagingSenderId: "123456789",
      appId: "demo-app-id",
    };
    app = initializeApp(fallbackConfig, "fallback");
  } else {
    throw error;
  }
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (process.env.NODE_ENV === "development") {
  try {
    // Only connect to emulators if Firebase is properly configured
    if (
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "your_actual_api_key_here"
    ) {
      connectAuthEmulator(auth, "http://localhost:9099");
      connectFirestoreEmulator(db, "localhost", 8080);
      connectStorageEmulator(storage, "localhost", 9199);
      connectFunctionsEmulator(functions, "localhost", 5001);
      console.log("🔌 Connected to Firebase emulators");
    } else {
      console.log("⚠️ Skipping emulator connection - using fallback config");
    }
  } catch (error) {
    console.log("Emulators already connected or not available");
  }
}

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
      // In production, implement proper role-based access control
      // For now, allow all authenticated users to read, only admins to write/delete
      const user = auth.currentUser;
      if (!user) return false;

      // Check if user has admin role (implement proper role checking)
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

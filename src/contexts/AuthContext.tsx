"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import UserService, { UserProfile } from "@/services/userService";
import SecurityService from "@/services/securityService";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Start security monitoring
    SecurityService.startSecurityMonitoring();

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user: User | null) => {
        setUser(user);

        if (user) {
          try {
            // Validate session with security service
            const sessionValidation = await SecurityService.validateSession();

            if (!sessionValidation.isValid) {
              console.warn(
                "Session validation failed:",
                sessionValidation.error
              );
              SecurityService.handleUnauthorizedAccess(
                sessionValidation.error || "Session validation failed"
              );
              return;
            }

            const profile = await UserService.getUserProfile(user.uid);
            if (profile) {
              setUserProfile(profile);
              setError(null);
            } else {
              // Create default user profile with access to all properties (for development)
              console.log("Creating default user profile for:", user.uid);
              const createResult = await UserService.createOrUpdateUserProfile(
                user.uid,
                {
                  email: user.email || "",
                  displayName: user.displayName || "",
                  role: "admin", // Give admin access for development
                  propertyIds: [], // Will be populated based on user's actual properties
                  accessiblePropertyIds: [], // Will be populated based on user's access
                  providerIds: [], // Will be populated based on user's providers
                }
              );

              if (createResult.success) {
                const newProfile = await UserService.getUserProfile(user.uid);
                setUserProfile(newProfile);
                setError(null);
              } else {
                setError("Failed to create user profile");
              }
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
            setError("Failed to load user profile");
          }
        } else {
          setUserProfile(null);
          setError(null);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Auth state change error:", error);
        setError("Authentication error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

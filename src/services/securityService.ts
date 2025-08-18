import { auth } from "./firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";

export class SecurityService {
  private static readonly ALLOWED_DOMAINS = [
    "localhost:3000",
    "localhost:3001",
    "flow34-bad8e.web.app",
    "flow34-bad8e.firebaseapp.com",
    // Add your production domains here
  ];

  /**
   * Check if current domain is allowed
   */
  static isDomainAllowed(): boolean {
    if (typeof window === "undefined") return true; // Server-side

    const currentDomain = window.location.host;
    return this.ALLOWED_DOMAINS.some(
      (domain) => currentDomain === domain || currentDomain.endsWith(domain)
    );
  }

  /**
   * Fallback token validation method
   */
  private static async validateTokenFallback(user: User): Promise<boolean> {
    try {
      // Try to get a fresh token
      const token = await user.getIdToken(true);
      return !!token;
    } catch (error) {
      console.error("Fallback token validation failed:", error);
      return false;
    }
  }

  /**
   * Validate user session and handle unauthorized access
   */
  static async validateSession(): Promise<{
    isValid: boolean;
    user: User | null;
    error?: string;
  }> {
    return new Promise((resolve) => {
      // Check domain first
      if (!this.isDomainAllowed()) {
        resolve({
          isValid: false,
          user: null,
          error: "Unauthorized domain access",
        });
        return;
      }

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.warn("Session validation timeout, using fallback");
        resolve({
          isValid: false,
          user: null,
          error: "Session validation timeout",
        });
      }, 10000); // 10 second timeout

      // Check authentication state
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        clearTimeout(timeoutId);
        unsubscribe();

        if (!user) {
          resolve({
            isValid: false,
            user: null,
            error: "No authenticated user",
          });
          return;
        }

        // Validate user token
        user
          .getIdTokenResult()
          .then((tokenResult) => {
            try {
              const now = Date.now() / 1000;

              // Check if token has expiration time and convert to number for comparison
              if (tokenResult.expirationTime) {
                const expirationTime =
                  new Date(tokenResult.expirationTime).getTime() / 1000;

                console.log("Token validation:", {
                  currentTime: now,
                  expirationTime: expirationTime,
                  isValid: expirationTime > now,
                });

                if (expirationTime < now) {
                  resolve({
                    isValid: false,
                    user: null,
                    error: "Token expired",
                  });
                  return;
                }
              } else {
                console.log(
                  "No expiration time found in token, assuming valid"
                );
              }

              resolve({
                isValid: true,
                user: user,
              });
            } catch (error) {
              console.error("Error during token validation:", error);
              // Try fallback validation
              this.validateTokenFallback(user).then((isValid) => {
                resolve({
                  isValid,
                  user: isValid ? user : null,
                  error: isValid ? undefined : "Fallback validation failed",
                });
              });
            }
          })
          .catch((error) => {
            console.error("Token validation error:", error);
            // Try fallback validation
            this.validateTokenFallback(user).then((isValid) => {
              resolve({
                isValid,
                user: isValid ? user : null,
                error: isValid ? undefined : "Fallback validation failed",
              });
            });
          });
      });
    });
  }

  /**
   * Handle unauthorized access attempts
   */
  static handleUnauthorizedAccess(error: string) {
    console.warn("Unauthorized access attempt:", error);

    // Log the attempt (in production, send to monitoring service)
    if (typeof window !== "undefined") {
      // Clear any stored auth data
      localStorage.removeItem("firebase:authUser:");
      sessionStorage.clear();

      // Redirect to login
      window.location.href = "/";
    }
  }

  /**
   * Monitor for suspicious activity
   */
  static startSecurityMonitoring() {
    if (typeof window === "undefined") return;

    // Monitor for domain changes
    let lastDomain = window.location.host;

    const checkDomain = () => {
      const currentDomain = window.location.host;
      if (currentDomain !== lastDomain) {
        console.warn("Domain change detected:", {
          from: lastDomain,
          to: currentDomain,
        });

        if (!this.isDomainAllowed()) {
          this.handleUnauthorizedAccess("Unauthorized domain change");
        }

        lastDomain = currentDomain;
      }
    };

    // Check every 5 seconds
    setInterval(checkDomain, 5000);

    // Monitor for page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        // Page became visible, validate session
        this.validateSession().then(({ isValid, error }) => {
          if (!isValid) {
            console.warn(
              "Session validation failed on page visibility:",
              error
            );
            this.handleUnauthorizedAccess(error || "Session validation failed");
          }
        });
      }
    });

    // Monitor for focus events
    window.addEventListener("focus", () => {
      // Validate session when window gains focus
      this.validateSession().then(({ isValid, error }) => {
        if (!isValid) {
          console.warn("Session validation failed on window focus:", error);
          this.handleUnauthorizedAccess(error || "Session validation failed");
        }
      });
    });
  }
}

export default SecurityService;

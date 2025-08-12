"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import { ServiceProviderService } from "@/services/serviceProviderService";
import UserService from "@/services/userService";

export default function LoginPage() {
  const [loginType, setLoginType] = useState("admin"); // "admin" or "service"
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login form data
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Signup form data
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    businessName: "",
    service: "",
    city: "",
    state: "",
  });

  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await signInWithEmailAndPassword(
        auth,
        loginData.email,
        loginData.password
      );
      router.replace("/dashboard/home"); // ✅ navigate on success
    } catch (error: any) {
      console.error("Login error:", error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    // Client-side validation
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (signupData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    // Check if all required fields are filled
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "businessName",
      "service",
      "city",
      "state",
    ];
    const missingFields = requiredFields.filter(
      (field) => !signupData[field as keyof typeof signupData]
    );

    if (missingFields.length > 0) {
      setError(
        `Please fill in all required fields: ${missingFields.join(", ")}`
      );
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      // Create Firebase user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        signupData.email,
        signupData.password
      );
      const user = userCredential.user;

      // Create user profile first
      const userProfileData = {
        email: signupData.email,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        phone: signupData.phone,
        role: "service_provider" as const,
        status: "pending" as const,
      };

      const userProfileResult = await UserService.createUserProfile(
        userProfileData
      );

      if (!userProfileResult.success) {
        await user.delete();
        setError(`Failed to create user profile: ${userProfileResult.error}`);
        return;
      }

      // Create service provider profile
      const providerData = {
        name: `${signupData.firstName} ${signupData.lastName}`,
        businessName: signupData.businessName, // Add the missing business name
        email: signupData.email,
        phone: signupData.phone,
        service: signupData.service,
        status: "pending" as const,
        rating: 0,
        propertyIds: [],
        serviceCategories: [signupData.service],
        serviceAreas: [`${signupData.city}, ${signupData.state}`],
        availability: {
          monday: { start: "09:00", end: "17:00", available: true },
          tuesday: { start: "09:00", end: "17:00", available: true },
          wednesday: { start: "09:00", end: "17:00", available: true },
          thursday: { start: "09:00", end: "17:00", available: true },
          friday: { start: "09:00", end: "17:00", available: true },
          saturday: { start: "09:00", end: "17:00", available: false },
          sunday: { start: "09:00", end: "17:00", available: false },
        },
        complianceStatus: {
          backgroundCheck: false,
          drugTest: false,
          safetyTraining: false,
          lastUpdated: new Date().toISOString(),
        },
        tags: [],
        notes: "Account created via signup form",
      };

      const providerResult = await ServiceProviderService.createProvider(
        providerData,
        user.uid
      );

      if (providerResult.success) {
        // Link the service provider to the user profile
        await UserService.linkServiceProvider(
          user.uid,
          providerResult.providerId!
        );

        setSuccess("Account created successfully! You can now log in.");
        setShowSignupModal(false);
        // Reset signup form
        setSignupData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          businessName: "",
          service: "",
          city: "",
          state: "",
        });
      } else {
        // If provider creation fails, delete the user account and profile
        await user.delete();
        setError(
          `Failed to create service provider profile: ${providerResult.error}`
        );
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "No account found with this email address";
      case "auth/wrong-password":
        return "Incorrect password";
      case "auth/invalid-email":
        return "Invalid email address";
      case "auth/weak-password":
        return "Password is too weak";
      case "auth/email-already-in-use":
        return "An account with this email already exists";
      case "auth/network-request-failed":
        return "Network error. Please check your connection";
      default:
        return "An error occurred. Please try again";
    }
  };

  const handleInputChange = (field: keyof typeof signupData, value: string) => {
    setSignupData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          maxWidth: 500,
          width: "100%",
          padding: 30,
          backgroundColor: "white",
          borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          margin: "0 20px",
        }}
      >
        <img
          src="/flow34.png"
          alt="Login Graphic"
          style={{
            width: "85%",
            height: "auto",
            marginBottom: 8,
            margin: "0 auto 8px auto",
            display: "block",
          }}
        />
        <h2
          style={{
            textAlign: "center",
            marginBottom: 8,
            color: "#333",
            fontSize: "20px",
            fontFamily: "Arial",
          }}
        >
          Welcome! Please log in
        </h2>

        {/* Login Type Selection */}
        <div style={{ marginBottom: 8 }}>
          <label
            style={{
              display: "block",
              marginBottom: 4,
              fontWeight: "bold",
              color: "#555",
              fontSize: "13px",
            }}
          >
            Login Type
          </label>
          <div style={{ display: "flex", gap: 4 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "5px 10px",
                borderRadius: 4,
                border: "1px solid #e1e5e9",
                backgroundColor: loginType === "admin" ? "#0070f3" : "#f8f9fa",
                color: loginType === "admin" ? "white" : "#6c757d",
                fontWeight: loginType === "admin" ? "600" : "500",
                fontSize: "13px",
                transition: "all 0.2s ease",
                flex: 1,
                textAlign: "center",
              }}
            >
              <input
                type="radio"
                name="loginType"
                value="admin"
                checked={loginType === "admin"}
                onChange={(e) => setLoginType(e.target.value)}
                style={{ display: "none" }}
              />
              Dev34
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "5px 10px",
                borderRadius: 4,
                border: "1px solid #e1e5e9",
                backgroundColor:
                  loginType === "service" ? "#0070f3" : "#f8f9fa",
                color: loginType === "service" ? "white" : "#6c757d",
                fontWeight: loginType === "service" ? "600" : "500",
                fontSize: "13px",
                transition: "all 0.2s ease",
                flex: 1,
                textAlign: "center",
              }}
            >
              <input
                type="radio"
                name="loginType"
                value="service"
                checked={loginType === "service"}
                onChange={(e) => setLoginType(e.target.value)}
                style={{ display: "none" }}
              />
              SP
            </label>
          </div>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={loginData.email}
          onChange={(e) =>
            setLoginData({ ...loginData, email: e.target.value })
          }
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 4,
            border: "1px solid #ccc",
            marginBottom: 4,
            fontSize: "14px",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={loginData.password}
          onChange={(e) =>
            setLoginData({ ...loginData, password: e.target.value })
          }
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 4,
            border: "1px solid #ccc",
            marginBottom: 8,
            fontSize: "14px",
          }}
        />
        {/* Error/Success Messages */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              color: "#dc2626",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "6px",
              color: "#16a34a",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {success}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            backgroundColor: loading ? "#9ca3af" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontWeight: "bold",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) => {
            if (!loading) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#0051cc";
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              (e.target as HTMLButtonElement).style.backgroundColor = loading
                ? "#9ca3af"
                : "#0070f3";
            }
          }}
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        {/* Create Account Button */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            onClick={() => setShowSignupModal(true)}
            style={{
              width: "100%",
              padding: 12,
              background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: "600",
              fontSize: "16px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.transform =
                "translateY(-2px)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 6px 20px rgba(16, 185, 129, 0.4)";
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 4px 15px rgba(16, 185, 129, 0.3)";
            }}
          >
            ✨ Create Account
          </button>
          <p
            style={{
              marginTop: 8,
              fontSize: "12px",
              color: "#6b7280",
              fontStyle: "italic",
            }}
          >
            New service providers can create an account here
          </p>
        </div>
      </div>

      {/* Signup Modal */}
      {showSignupModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 0,
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
              animation: "slideUp 0.3s ease-out",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "24px 32px 20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Create Your Account
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "4px 0 0 0",
                  }}
                >
                  Join Flow34 as a service provider
                </p>
              </div>
              <button
                onClick={() => setShowSignupModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "4px",
                  borderRadius: "6px",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) =>
                  ((e.target as HTMLButtonElement).style.backgroundColor =
                    "#f3f4f6")
                }
                onMouseOut={(e) =>
                  ((e.target as HTMLButtonElement).style.backgroundColor =
                    "transparent")
                }
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSignup();
              }}
              style={{ padding: "32px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "24px",
                }}
              >
                {/* Left Column */}
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "16px",
                    }}
                  >
                    Personal Information
                  </h3>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="Enter first name"
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="Enter last name"
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={signupData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="Enter email address"
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={signupData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="+27 12 345 6789"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "16px",
                    }}
                  >
                    Business Information
                  </h3>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.businessName}
                      onChange={(e) =>
                        handleInputChange("businessName", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="Enter business name"
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      Service Type *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.service}
                      onChange={(e) =>
                        handleInputChange("service", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="e.g., Cleaning, Maintenance, Security"
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.city}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="Enter city"
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.state}
                      onChange={(e) =>
                        handleInputChange("state", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="Enter state"
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div style={{ marginTop: "24px" }}>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "16px",
                  }}
                >
                  Security
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={signupData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="Create a password"
                    />
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        margin: "4px 0 0 0",
                      }}
                    >
                      Must be at least 6 characters
                    </p>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={signupData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px 16px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#dc2626",
                    fontSize: "14px",
                  }}
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px 16px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    color: "#16a34a",
                    fontSize: "14px",
                  }}
                >
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <div style={{ marginTop: "32px" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background:
                      "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "600",
                    fontSize: "16px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      (e.target as HTMLButtonElement).style.transform =
                        "translateY(-2px)";
                      (e.target as HTMLButtonElement).style.boxShadow =
                        "0 6px 20px rgba(16, 185, 129, 0.4)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loading) {
                      (e.target as HTMLButtonElement).style.transform =
                        "translateY(0)";
                      (e.target as HTMLButtonElement).style.boxShadow =
                        "0 4px 15px rgba(16, 185, 129, 0.3)";
                    }
                  }}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div
              style={{
                padding: "20px 32px 24px",
                borderTop: "1px solid #e5e7eb",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                By creating an account, you agree to our{" "}
                <a
                  href="#"
                  style={{ color: "#3b82f6", textDecoration: "none" }}
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  style={{ color: "#3b82f6", textDecoration: "none" }}
                >
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

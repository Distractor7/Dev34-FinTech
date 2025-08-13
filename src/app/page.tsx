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
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginData.email,
        loginData.password
      );

      const user = userCredential.user;

      // Get user profile to check their actual role
      const userProfile = await UserService.getUserProfile(user.uid);

      if (!userProfile) {
        setError("User profile not found. Please contact support.");
        setLoading(false);
        return;
      }

      // Check if login type matches user's actual role
      const expectedRole = loginType === "admin" ? "admin" : "service_provider";

      if (userProfile.role !== expectedRole) {
        setError(
          `This account is registered as a ${userProfile.role.replace(
            "_",
            " "
          )}. Please select the correct login type.`
        );
        setLoading(false);
        return;
      }

      // Update last login time
      await UserService.updateLastLogin(user.uid);

      setSuccess("Login successful! Redirecting...");

      // Route based on user type
      if (userProfile.role === "admin") {
        setTimeout(() => router.push("/dashboard/home"), 1000);
      } else {
        // Service providers go to a "Coming Soon" page
        setTimeout(() => router.push("/dashboard/coming-soon"), 1000);
      }
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

        // IMPORTANT: Sign out the user immediately after signup
        // This prevents auto-login and ensures they select the correct login type
        await auth.signOut();

        setSuccess(
          "Account created successfully! You can now log in with the 'SP' login type."
        );
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-2xl p-10 mx-4">
        <img
          src="/flow34.png"
          alt="Login Graphic"
          className="w-4/5 h-auto mx-auto mb-4 block"
        />
        <h2 className="text-center mb-4 text-2xl font-semibold text-gray-800">
          Welcome! Please log in
        </h2>

        {/* Login Type Selection */}
        <div className="mb-4">
          <label className="block mb-2 font-semibold text-gray-700 text-base">
            Login Type
          </label>
          <div className="flex gap-2">
            <label
              className={`flex items-center justify-center cursor-pointer px-3 py-2 rounded border transition-all duration-200 flex-1 text-center text-sm font-medium ${
                loginType === "admin"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 text-gray-600 border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="loginType"
                value="admin"
                checked={loginType === "admin"}
                onChange={(e) => setLoginType(e.target.value)}
                className="hidden"
              />
              Dev34
            </label>
            <label
              className={`flex items-center justify-center cursor-pointer px-3 py-2 rounded border transition-all duration-200 flex-1 text-center text-sm font-medium ${
                loginType === "service"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 text-gray-600 border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="loginType"
                value="service"
                checked={loginType === "service"}
                onChange={(e) => setLoginType(e.target.value)}
                className="hidden"
              />
              SP
            </label>
          </div>

          {/* Helpful message based on selection */}
          <div className="mt-2 text-sm text-gray-500 italic text-center">
            {loginType === "admin"
              ? "Dev34: For admin users and property managers"
              : "SP: For service providers and contractors"}
          </div>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={loginData.email}
          onChange={(e) =>
            setLoginData({ ...loginData, email: e.target.value })
          }
          className="w-full px-4 py-3 rounded border border-gray-300 mb-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="password"
          placeholder="Password"
          value={loginData.password}
          onChange={(e) =>
            setLoginData({ ...loginData, password: e.target.value })
          }
          className="w-full px-4 py-3 rounded border border-gray-300 mb-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {/* Error/Success Messages */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm mb-4">
            {success}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white border-none rounded-md font-semibold text-lg cursor-pointer disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        {/* Create Account Button */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowSignupModal(true)}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            ✨ Create Account
          </button>
          <p className="mt-2 text-xs text-gray-500 italic">
            New service providers can create an account here
          </p>
        </div>
      </div>

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-2 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Create Your Account
                </h3>
                <p className="text-gray-600 mt-2 text-lg">
                  Join Flow34 as a service provider
                </p>
              </div>
              <button
                onClick={() => setShowSignupModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-2xl text-gray-500">×</span>
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSignup();
              }}
              className="p-6"
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Left Column */}
                <div>
                  <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                    Personal Information
                  </h3>

                  <div className="mb-6">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter last name"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={signupData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={signupData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+27 12 345 6789"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                    Business Information
                  </h3>

                  <div className="mb-6">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.businessName}
                      onChange={(e) =>
                        handleInputChange("businessName", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter business name"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Service Type *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.service}
                      onChange={(e) =>
                        handleInputChange("service", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Cleaning, Maintenance, Security"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.city}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter city"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.state}
                      onChange={(e) =>
                        handleInputChange("state", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter state"
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="mt-12">
                <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                  Security
                </h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={signupData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Create a password"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Must be at least 6 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={signupData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="mt-8 px-6 py-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-base">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-8 px-6 py-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-base">
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-12">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                By creating an account, you agree to our{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Remove old CSS animations since we're using Tailwind now */}
    </div>
  );
}

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
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Building,
  Phone,
  MapPin,
  X,
  Plus,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  businessName: string;
  service: string;
  city: string;
  state: string;
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [signupData, setSignupData] = useState<SignupFormData>({
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginData.email,
        loginData.password
      );

      // Update last login time
      await UserService.updateLastLogin(userCredential.user.uid);

      setSuccess("Login successful! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (error: any) {
      console.error("Login error:", error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validation
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
      (field) => !signupData[field as keyof SignupFormData]
    );

    if (missingFields.length > 0) {
      setError(
        `Please fill in all required fields: ${missingFields.join(", ")}`
      );
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      // Create user account
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
        // If user profile creation fails, delete the user account
        await user.delete();
        setError(`Failed to create user profile: ${userProfileResult.error}`);
        return;
      }

      // Create service provider profile
      const providerData = {
        name: `${signupData.firstName} ${signupData.lastName}`,
        email: signupData.email,
        phone: signupData.phone,
        service: signupData.service,
        status: "pending" as const,
        rating: 0,
        propertyIds: [],
        businessName: signupData.businessName,
        businessAddress: {
          street: "",
          city: signupData.city,
          state: signupData.state,
          zipCode: "",
          country: "South Africa",
        },
        serviceCategories: [signupData.service],
        serviceAreas: [signupData.city, signupData.state],
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

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setSignupData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <Building className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Flow34
          </h2>
          <p className="text-gray-600">
            Manage your service providers and financial operations
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="email"
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowSignupModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        </div>

        {/* Signup Section */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200 relative overflow-hidden">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-400 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400 rounded-full translate-y-12 -translate-x-12"></div>
          </div>
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">
                New to Flow34?
              </h3>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                NEW
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              Join as a service provider and start managing your business
              operations with our comprehensive platform.
            </p>
            <button
              onClick={() => setShowSignupModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              Create Account
            </button>
          </div>
        </div>

        {/* Signup Modal */}
        {showSignupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Create Your Account
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Join Flow34 as a service provider
                  </p>
                </div>
                <button
                  onClick={() => setShowSignupModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              {/* Signup Form */}
              <form onSubmit={handleSignup} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Personal Information
                    </h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupData.firstName}
                        onChange={(e) =>
                          handleInputChange("firstName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Enter first name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupData.lastName}
                        onChange={(e) =>
                          handleInputChange("lastName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Enter last name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="email"
                          required
                          value={signupData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="Enter email address"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="tel"
                          required
                          value={signupData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="+27 12 345 6789"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Building className="h-5 w-5 text-green-600" />
                      Business Information
                    </h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupData.businessName}
                        onChange={(e) =>
                          handleInputChange("businessName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Enter business name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Type *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupData.service}
                        onChange={(e) =>
                          handleInputChange("service", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="e.g., Cleaning, Maintenance, Security"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={signupData.city}
                          onChange={(e) =>
                            handleInputChange("city", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State/Province *
                        </label>
                        <input
                          type="text"
                          required
                          value={signupData.state}
                          onChange={(e) =>
                            handleInputChange("state", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="Enter state"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Section */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-red-600" />
                    Security
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={signupData.password}
                          onChange={(e) =>
                            handleInputChange("password", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Must be at least 6 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={signupData.confirmPassword}
                          onChange={(e) =>
                            handleInputChange("confirmPassword", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-700">{success}</span>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSignupModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Account
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  By creating an account, you agree to our{" "}
                  <a
                    href="#"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Privacy Policy
                  </a>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

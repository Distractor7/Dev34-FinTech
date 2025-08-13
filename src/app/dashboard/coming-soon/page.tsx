"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/services/firebaseConfig";
import UserService from "@/services/userService";
import { Building, Clock, ArrowLeft, User } from "lucide-react";

export default function ComingSoonPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserAccess = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.push("/");
          return;
        }

        const profile = await UserService.getUserProfile(user.uid);
        if (!profile) {
          router.push("/");
          return;
        }

        // Only allow service providers to access this page
        if (profile.role !== "service_provider") {
          router.push("/dashboard/home");
          return;
        }

        setUserProfile(profile);
      } catch (error) {
        console.error("Error checking user access:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkUserAccess();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleGoBack = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Building className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Flow34</h1>
            </div>

            <div className="flex items-center space-x-4">
              {userProfile && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>
                    {userProfile.firstName} {userProfile.lastName}
                  </span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto h-24 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-8">
            <Clock className="h-12 w-12 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Coming Soon!
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-8">
            We're working hard to build your service provider dashboard
          </p>

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <p className="text-gray-600 mb-6 leading-relaxed">
              Thank you for joining Flow34! We're currently developing a
              comprehensive dashboard specifically designed for service
              providers like you. This will include features like:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                <span className="text-gray-700">
                  Service request management
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                <span className="text-gray-700">Financial reporting</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                <span className="text-gray-700">
                  Property access management
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                <span className="text-gray-700">Performance analytics</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-blue-800 text-sm">
              <strong>Status:</strong> In Development • Expected Release: Q1
              2025
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Login</span>
            </button>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <span>Sign Out</span>
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-12 text-sm text-gray-500">
            <p>Have questions? Contact us at support@flow34.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

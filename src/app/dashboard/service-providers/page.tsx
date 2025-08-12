"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Building,
  Activity,
  Star,
  Clock,
  MapPin,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PlusCircle,
  Download,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Provider,
  ServiceProviderCreateRequest,
  ServiceProviderUpdateRequest,
} from "@/types/float34";
import ServiceProviderService from "@/services/serviceProviderService";
import { auth } from "@/services/firebaseConfig";

// Service Provider Form Component
function ServiceProviderForm({
  provider,
  isOpen,
  onClose,
  onSubmit,
  mode = "create",
}: {
  provider?: Provider;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: ServiceProviderCreateRequest | ServiceProviderUpdateRequest
  ) => void;
  mode?: "create" | "edit";
}) {
  const [formData, setFormData] = useState<Partial<Provider>>({
    name: "",
    email: "",
    phone: "",
    service: "",
    status: "pending",
    rating: 0,
    propertyIds: [],
    businessName: "",
    taxId: "",
    businessAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    serviceCategories: [],
    serviceAreas: [],
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
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (provider && mode === "edit") {
      setFormData(provider);
    }
  }, [provider, mode]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) newErrors.name = "Name is required";
    if (!formData.email?.trim()) newErrors.email = "Email is required";
    if (!formData.service?.trim()) newErrors.service = "Service is required";
    if (!formData.phone?.trim()) newErrors.phone = "Phone is required";

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(
        formData as ServiceProviderCreateRequest | ServiceProviderUpdateRequest
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {mode === "create"
              ? "Add New Service Provider"
              : "Edit Service Provider"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Provider name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="provider@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service *
              </label>
              <input
                type="text"
                value={formData.service || ""}
                onChange={(e) => handleInputChange("service", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.service ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., Cleaning, Maintenance, Security"
              />
              {errors.service && (
                <p className="text-red-500 text-sm mt-1">{errors.service}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status || "pending"}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleInputChange("rating", star)}
                    className={`text-2xl ${
                      star <= (formData.rating || 0)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
                <span className="text-sm text-gray-500 ml-2">
                  {formData.rating || 0}/5
                </span>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.businessName || ""}
                  onChange={(e) =>
                    handleInputChange("businessName", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={formData.taxId || ""}
                  onChange={(e) => handleInputChange("taxId", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tax identification number"
                />
              </div>
            </div>

            {/* Business Address */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Address
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={formData.businessAddress?.street || ""}
                  onChange={(e) =>
                    handleInputChange("businessAddress", {
                      ...formData.businessAddress,
                      street: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Street address"
                />
                <input
                  type="text"
                  value={formData.businessAddress?.city || ""}
                  onChange={(e) =>
                    handleInputChange("businessAddress", {
                      ...formData.businessAddress,
                      city: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City"
                />
                <input
                  type="text"
                  value={formData.businessAddress?.state || ""}
                  onChange={(e) =>
                    handleInputChange("businessAddress", {
                      ...formData.businessAddress,
                      state: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="State"
                />
              </div>
            </div>
          </div>

          {/* Service Categories and Areas */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Service Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Categories
                </label>
                <input
                  type="text"
                  value={formData.serviceCategories?.join(", ") || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "serviceCategories",
                      e.target.value.split(", ").filter(Boolean)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Category 1, Category 2, Category 3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate categories with commas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Areas
                </label>
                <input
                  type="text"
                  value={formData.serviceAreas?.join(", ") || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "serviceAreas",
                      e.target.value.split(", ").filter(Boolean)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Area 1, Area 2, Area 3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate areas with commas
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Status */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Compliance Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.complianceStatus?.backgroundCheck || false}
                  onChange={(e) =>
                    handleInputChange("complianceStatus", {
                      ...formData.complianceStatus,
                      backgroundCheck: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Background Check</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.complianceStatus?.drugTest || false}
                  onChange={(e) =>
                    handleInputChange("complianceStatus", {
                      ...formData.complianceStatus,
                      drugTest: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Drug Test</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.complianceStatus?.safetyTraining || false}
                  onChange={(e) =>
                    handleInputChange("complianceStatus", {
                      ...formData.complianceStatus,
                      safetyTraining: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Safety Training</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes about this service provider..."
            />
          </div>

          {/* Form Actions */}
          <div className="border-t pt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              {mode === "create" ? "Create Provider" : "Update Provider"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Service Provider Card Component
function ServiceProviderCard({
  provider,
  onEdit,
  onDelete,
  onView,
}: {
  provider: Provider;
  onEdit: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
  onView: (provider: Provider) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle size={16} />;
      case "inactive":
        return <XCircle size={16} />;
      case "pending":
        return <Clock size={16} />;
      case "suspended":
        return <AlertTriangle size={16} />;
      default:
        return <XCircle size={16} />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {provider.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                provider.status
              )}`}
            >
              {getStatusIcon(provider.status)}
              {provider.status}
            </span>
          </div>

          <p className="text-gray-600 mb-1">{provider.service}</p>
          {provider.businessName && (
            <p className="text-sm text-gray-500">{provider.businessName}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                className={`${
                  star <= provider.rating
                    ? "text-yellow-400 fill-current"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="text-sm text-gray-500 ml-1">
              ({provider.rating})
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Activity size={16} />
          <span>{provider.serviceCategories?.length || 0} categories</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin size={16} />
          <span>{provider.serviceAreas?.length || 0} areas</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Building size={16} />
          <span>{provider.propertyIds?.length || 0} properties</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Shield size={16} />
          <span>
            {
              Object.values(provider.complianceStatus || {}).filter(Boolean)
                .length
            }
            /3 compliant
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Last active: {new Date(provider.lastActive).toLocaleDateString()}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(provider)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => onEdit(provider)}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Edit provider"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(provider)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete provider"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Service Providers Page
export default function ServiceProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "pending" | "suspended" | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<
    Provider | undefined
  >();
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    suspended: 0,
  });

  // Check Firebase connection status
  const checkConnection = useCallback(async () => {
    setConnectionStatus('checking');
    try {
      // Try to fetch a small amount of data to test connection
      const result = await ServiceProviderService.getProviders({}, undefined, 1);
      setConnectionStatus('connected');
      return true;
    } catch (error) {
      console.warn('Firebase connection check failed:', error);
      setConnectionStatus('disconnected');
      return false;
    }
  }, []);

  // Load providers
  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const isConnected = await checkConnection();
      if (!isConnected) {
        console.warn('Firebase not connected, skipping data load');
        setProviders([]);
        setStats({ total: 0, active: 0, inactive: 0, pending: 0, suspended: 0 });
        return;
      }

      const result = await ServiceProviderService.getProviders({
        status: statusFilter || undefined,
      });
      setProviders(result.providers);
      
      // Load stats
      const providerStats = await ServiceProviderService.getProviderStats();
      setStats(providerStats);
    } catch (error) {
      console.error("Error loading providers:", error);
      setProviders([]);
      setStats({ total: 0, active: 0, inactive: 0, pending: 0, suspended: 0 });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, checkConnection]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Search providers
  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle form submission
  const handleFormSubmit = async (
    data: ServiceProviderCreateRequest | ServiceProviderUpdateRequest
  ) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to perform this action");
        return;
      }

      if (formMode === "create") {
        const result = await ServiceProviderService.createProvider(
          data as ServiceProviderCreateRequest,
          user.uid
        );
        if (result.success) {
          alert("Service provider created successfully!");
          setShowForm(false);
          loadProviders();
        } else {
          alert(`Error: ${result.error}`);
        }
      } else {
        const result = await ServiceProviderService.updateProvider(
          editingProvider!.id,
          data as ServiceProviderUpdateRequest,
          user.uid
        );
        if (result.success) {
          alert("Service provider updated successfully!");
          setShowForm(false);
          setEditingProvider(undefined);
          loadProviders();
        } else {
          alert(`Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while saving the provider");
    }
  };

  // Handle provider deletion
  const handleDeleteProvider = async (provider: Provider) => {
    if (!confirm(`Are you sure you want to delete ${provider.name}?`)) {
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to perform this action");
        return;
      }

      const result = await ServiceProviderService.deleteProvider(
        provider.id,
        user.uid
      );
      if (result.success) {
        alert("Service provider deleted successfully!");
        loadProviders();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting provider:", error);
      alert("An error occurred while deleting the provider");
    }
  };

  // Handle edit provider
  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setFormMode("edit");
    setShowForm(true);
  };

  // Handle view provider
  const handleViewProvider = (provider: Provider) => {
    // TODO: Implement detailed view modal
    alert(`Viewing details for ${provider.name}`);
  };

  // Handle create new provider
  const handleCreateProvider = () => {
    setEditingProvider(undefined);
    setFormMode("create");
    setShowForm(true);
  };

  // Retry connection
  const handleRetryConnection = () => {
    checkConnection().then(() => {
      if (connectionStatus === 'connected') {
        loadProviders();
      }
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Connection Status Banner */}
      {connectionStatus === 'disconnected' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <WifiOff className="text-red-500" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Firebase Connection Lost
              </h3>
              <p className="text-sm text-red-600">
                Unable to connect to Firebase. Please check your internet connection and try again.
              </p>
            </div>
            <button
              onClick={handleRetryConnection}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Service Providers
          </h1>
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-1 text-green-600">
              <Wifi size={16} />
              <span className="text-sm">Connected</span>
            </div>
          )}
        </div>
        <p className="text-gray-600">
          Manage your service providers, view performance metrics, and handle
          compliance requirements.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.active}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="text-yellow-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-600">
                {stats.inactive}
              </p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <XCircle className="text-gray-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspended</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.suspended}
              </p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mb-6">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search service providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
                        </div>
                      </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "active" | "inactive" | "pending" | "suspended" | "")}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>

          <button
            onClick={handleCreateProvider}
            disabled={connectionStatus !== 'connected'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            Add Provider
                        </button>
        </div>
      </div>

      {/* Providers Grid */}
      {connectionStatus === 'connected' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <ServiceProviderCard
              key={provider.id}
              provider={provider}
              onEdit={handleEditProvider}
              onDelete={handleDeleteProvider}
              onView={handleViewProvider}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <WifiOff className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Firebase Connection Required
          </h3>
          <p className="text-gray-600 mb-4">
            Unable to connect to Firebase. Please check your connection and try again.
          </p>
          <button
            onClick={handleRetryConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      )}

      {connectionStatus === 'connected' && filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No service providers found
          </h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter
              ? "Try adjusting your search or filter criteria."
              : "Get started by adding your first service provider."}
          </p>
          {!searchQuery && !statusFilter && (
            <button
              onClick={handleCreateProvider}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Service Provider
            </button>
          )}
        </div>
      )}

      {/* Service Provider Form Modal */}
      <ServiceProviderForm
        provider={editingProvider}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingProvider(undefined);
        }}
        onSubmit={handleFormSubmit}
        mode={formMode}
      />
    </div>
  );
}

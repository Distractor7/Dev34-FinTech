"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, Search, Edit, Trash2, Users, X } from "lucide-react";
import { Provider, Property } from "@/types/float34";
import { getApi } from "@/lib/api";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ServiceProvidersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // URL state
  const searchTerm = searchParams.get("q") || "";
  const propertyId = searchParams.get("propertyId") || "";

  // Debounced search for API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Get selected property name for display
  const selectedProperty = properties.find((p) => p.id === propertyId);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const api = getApi();
      const [providersData, propertiesData] = await Promise.all([
        api.listProviders({
          q: debouncedSearchTerm,
          propertyId: propertyId || undefined,
        }),
        api.listProperties(),
      ]);
      setProviders(providersData);
      setProperties(propertiesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL params
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const handleSearchChange = (value: string) => {
    updateSearchParams({ q: value || null });
  };

  const handlePropertyChange = (value: string) => {
    updateSearchParams({ propertyId: value || null });
  };

  const clearAllFilters = () => {
    updateSearchParams({ q: null, propertyId: null });
  };

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Service Providers
          </h1>
          <p className="text-gray-600">
            Manage your service providers and partnerships
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Provider
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search providers..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={propertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>

          {(searchTerm || propertyId) && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {(searchTerm || propertyId) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Search: "{searchTerm}"
                <button
                  onClick={() => handleSearchChange("")}
                  className="ml-1 hover:text-blue-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {propertyId && selectedProperty && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Property: {selectedProperty.name}
                <button
                  onClick={() => handlePropertyChange("")}
                  className="ml-1 hover:text-green-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Providers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {providers.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Active Providers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {providers.filter((p) => p.status === "active").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Users className="text-yellow-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {(
                  providers.reduce((acc, p) => acc + p.rating, 0) /
                  providers.length
                ).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Providers Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-500">
                        Loading providers...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : providers.length > 0 ? (
                providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {provider.service}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {provider.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {provider.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          provider.status
                        )}`}
                      >
                        {provider.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">
                          {provider.rating}
                        </span>
                        <span className="text-yellow-400 ml-1">★</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Edit size={16} />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && providers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {propertyId && selectedProperty
              ? `No providers found for ${selectedProperty.name}`
              : "No providers found"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || propertyId
              ? "Try clearing some filters or adjusting your search terms."
              : "Get started by adding a new service provider."}
          </p>
          {(searchTerm || propertyId) && (
            <button
              onClick={clearAllFilters}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

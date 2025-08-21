"use client";

import { useState, useEffect } from "react";
import {
  X,
  Download,
  Printer,
  Eye,
  Building2,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Invoice, InvoiceLineItem } from "../types/float34";

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
}: InvoiceDetailModalProps) {
  const [providerName, setProviderName] = useState<string>("");
  const [propertyName, setPropertyName] = useState<string>("");

  useEffect(() => {
    if (invoice) {
      // Fetch provider and property names
      fetchProviderAndPropertyNames();
    }
  }, [invoice]);

  const fetchProviderAndPropertyNames = async () => {
    try {
      // Import services dynamically to avoid circular dependencies
      const { ServiceProviderService } = await import(
        "@/services/serviceProviderService"
      );
      const { PropertyService } = await import("@/services/propertyService");

      if (invoice?.providerId) {
        const provider = await ServiceProviderService.getProviderById(
          invoice.providerId
        );
        if (provider) {
          setProviderName(provider.businessName || provider.name);
        }
      }

      if (invoice?.propertyId) {
        const property = await PropertyService.getPropertyById(
          invoice.propertyId
        );
        if (property) {
          setPropertyName(property.name);
        }
      }
    } catch (error) {
      console.error("Error fetching provider/property names:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a printable version and download as PDF
    // This is a placeholder - you can implement PDF generation later
    alert("PDF download functionality coming soon!");
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div
      className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 transition-all duration-300"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 border border-white/20 transform transition-all duration-300 hover:scale-[1.01]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Invoice Details
            </h2>
            <p className="text-gray-600">View and manage invoice information</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Download size={16} className="mr-2" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Printer size={16} className="mr-2" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-6">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Dev34</h1>
                  <p className="text-gray-600">
                    Professional Property Management
                  </p>
                </div>
              </div>
              <p className="text-gray-600 mt-2">
                123 Business Street, Suite 100
              </p>
              <p className="text-gray-600">City, State 12345</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
              <p className="text-gray-600">#{invoice.invoiceNumber}</p>
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(
                  invoice.status
                )}`}
              >
                {invoice.status.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <User size={16} className="mr-2" />
                Bill To
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900">
                  {providerName || "Loading..."}
                </p>
                <p className="text-gray-600">Service Provider</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Building2 size={16} className="mr-2" />
                Property
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900">
                  {propertyName || "Loading..."}
                </p>
                <p className="text-gray-600">Service Location</p>
              </div>
            </div>
          </div>

          {/* Invoice Dates */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">
                Issue Date
              </h4>
              <div className="flex items-center">
                <Calendar size={16} className="mr-2 text-gray-400" />
                <span className="text-gray-900">
                  {formatDate(invoice.issueDate)}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">
                Due Date
              </h4>
              <div className="flex items-center">
                <Calendar size={16} className="mr-2 text-gray-400" />
                <span className="text-gray-900">
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
            </div>
            {invoice.paidDate && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">
                  Paid Date
                </h4>
                <div className="flex items-center">
                  <Calendar size={16} className="mr-2 text-gray-400" />
                  <span className="text-gray-900">
                    {formatDate(invoice.paidDate)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Service Details
            </h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.lineItems && invoice.lineItems.length > 0 ? (
                    invoice.lineItems.map(
                      (item: InvoiceLineItem, index: number) => (
                        <tr key={index} className="bg-white">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr className="bg-white">
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center">
                          <DollarSign className="h-8 w-8 text-gray-300 mb-2" />
                          <p>No line items available</p>
                          <p className="text-sm">
                            This invoice doesn't have detailed line items
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="text-gray-900">
                    {formatCurrency(invoice.tax)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-gray-900">
                      {formatCurrency(invoice.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Notes
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{invoice.notes}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6">
            <div className="text-center text-gray-600">
              <p>Thank you for your business!</p>
              <p className="text-sm mt-1">
                Dev34 - Professional Property Management Solutions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

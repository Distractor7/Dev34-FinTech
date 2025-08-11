"use client";

import { useState } from "react";
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
} from "lucide-react";

interface FinancialData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  growth: number;
  invoices: number;
  paidInvoices: number;
}

const mockMonthlyData: FinancialData[] = [
  {
    period: "January 2024",
    revenue: 45000,
    expenses: 28000,
    profit: 17000,
    growth: 12.5,
    invoices: 25,
    paidInvoices: 22,
  },
  {
    period: "December 2023",
    revenue: 42000,
    expenses: 26500,
    profit: 15500,
    growth: 8.3,
    invoices: 23,
    paidInvoices: 20,
  },
  {
    period: "November 2023",
    revenue: 38500,
    expenses: 24000,
    profit: 14500,
    growth: -2.1,
    invoices: 21,
    paidInvoices: 18,
  },
];

const mockWeeklyData: FinancialData[] = [
  {
    period: "Week 3, Jan 2024",
    revenue: 12500,
    expenses: 7800,
    profit: 4700,
    growth: 15.2,
    invoices: 7,
    paidInvoices: 6,
  },
  {
    period: "Week 2, Jan 2024",
    revenue: 10800,
    expenses: 7200,
    profit: 3600,
    growth: 8.7,
    invoices: 6,
    paidInvoices: 5,
  },
  {
    period: "Week 1, Jan 2024",
    revenue: 9900,
    expenses: 6500,
    profit: 3400,
    growth: -5.2,
    invoices: 5,
    paidInvoices: 4,
  },
];

export default function FinancialReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"weekly" | "monthly">(
    "monthly"
  );
  const [selectedData] = useState(
    selectedPeriod === "monthly" ? mockMonthlyData : mockWeeklyData
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  const currentPeriod = selectedData[0];
  const previousPeriod = selectedData[1];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Financial Reports
          </h1>
          <p className="text-gray-600">
            Weekly and monthly financial analytics
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Download size={20} />
          Export Report
        </button>
      </div>

      {/* Period Toggle */}
      <div className="mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedPeriod("monthly")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === "monthly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Monthly Reports
          </button>
          <button
            onClick={() => setSelectedPeriod("weekly")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === "weekly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Weekly Reports
          </button>
        </div>
      </div>

      {/* Current Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentPeriod.revenue)}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(currentPeriod.growth)}
                <span
                  className={`text-sm ml-1 ${getGrowthColor(
                    currentPeriod.growth
                  )}`}
                >
                  {formatPercentage(currentPeriod.growth)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <DollarSign className="text-red-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentPeriod.expenses)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profit</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentPeriod.profit)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {((currentPeriod.profit / currentPeriod.revenue) * 100).toFixed(
                  1
                )}
                % margin
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="text-purple-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Invoices</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentPeriod.paidInvoices}/{currentPeriod.invoices}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {(
                  (currentPeriod.paidInvoices / currentPeriod.invoices) *
                  100
                ).toFixed(0)}
                % paid
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedPeriod === "monthly" ? "Monthly" : "Weekly"} Financial
            History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Growth
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {data.period}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(data.revenue)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(data.expenses)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(data.profit)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getGrowthIcon(data.growth)}
                      <span
                        className={`text-sm ml-1 ${getGrowthColor(
                          data.growth
                        )}`}
                      >
                        {formatPercentage(data.growth)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {data.paidInvoices}/{data.invoices}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Key Performance Indicators
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Average Monthly Revenue
              </span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(
                  selectedData.reduce((sum, d) => sum + d.revenue, 0) /
                    selectedData.length
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Average Profit Margin
              </span>
              <span className="text-sm font-medium text-gray-900">
                {(
                  (selectedData.reduce((sum, d) => sum + d.profit, 0) /
                    selectedData.reduce((sum, d) => sum + d.revenue, 0)) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Invoice Payment Rate
              </span>
              <span className="text-sm font-medium text-gray-900">
                {(
                  (selectedData.reduce((sum, d) => sum + d.paidInvoices, 0) /
                    selectedData.reduce((sum, d) => sum + d.invoices, 0)) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trends
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Highest Revenue</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(
                  Math.max(...selectedData.map((d) => d.revenue))
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Lowest Revenue</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(
                  Math.min(...selectedData.map((d) => d.revenue))
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue Growth</span>
              <span
                className={`text-sm font-medium ${getGrowthColor(
                  currentPeriod.growth
                )}`}
              >
                {formatPercentage(currentPeriod.growth)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

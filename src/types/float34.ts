export type Property = {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type Provider = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  status: "active" | "inactive";
  rating: number;
  propertyIds: string[]; // IDs of properties where they operate
};

export type PeriodGranularity = "MONTH" | "WEEK";

export type PropertyFinancialAggregate = {
  propertyId: string;
  propertyName: string;
  periodFrom: string; // ISO
  periodTo: string;   // ISO
  granularity: PeriodGranularity;
  currency: "ZAR" | "EUR" | "USD";
  // totals
  revenue: number;     // gross inflows from all providers at property
  expenses?: number;   // optional (fees/opex if modeled)
  profit?: number;     // revenue - expenses
  marginPct?: number;  // profit / revenue
  invoices: { paid: number; total: number }; // statements marked PAID vs total
  // QoQ/PoP deltas for badges
  revenueDeltaPct?: number;
  profitDeltaPct?: number;
  // trend points for sparkline cards
  trend?: Array<{ label: string; revenue: number; profit?: number }>;
};

export type PropertyRankItem = {
  propertyId: string;
  propertyName: string;
  revenue: number;
  profit?: number;
  marginPct?: number;
  invoicesPaidPct?: number;
};

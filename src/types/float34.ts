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
  status: "active" | "inactive" | "pending" | "suspended";
  rating: number;
  propertyIds: string[]; // IDs of properties where they operate

  // Business Information
  businessName?: string;
  taxId?: string;
  businessAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessLicense?: string;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
    coverageAmount: number;
  };

  // Service Details
  serviceCategories: string[];
  serviceAreas: string[]; // Geographic areas served
  availability: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };

  // API & Integration Details
  apiConnections?: {
    [key: string]: {
      apiKey: string; // Encrypted
      apiSecret?: string; // Encrypted
      endpoint: string;
      isActive: boolean;
      lastSync?: string;
      syncStatus: "success" | "failed" | "pending";
      errorMessage?: string;
    };
  };

  // Financial Information
  financialDetails?: {
    bankAccount?: {
      accountNumber: string; // Encrypted
      routingNumber: string; // Encrypted
      accountType: "checking" | "savings";
      bankName: string;
    };
    paymentMethods: {
      type: "bank_transfer" | "check" | "digital_wallet";
      details: any; // Encrypted
      isDefault: boolean;
    }[];
    taxRate: number;
    currency: string;
    paymentTerms: number; // days
  };

  // Performance Metrics
  performanceMetrics?: {
    responseTime: number; // average response time in hours
    completionRate: number; // percentage of completed jobs
    customerSatisfaction: number; // average rating
    onTimeDelivery: number; // percentage of on-time deliveries
  };

  // Audit & Compliance
  complianceStatus: {
    backgroundCheck: boolean;
    drugTest: boolean;
    safetyTraining: boolean;
    lastUpdated: string;
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastActive: string;

  // Metadata
  tags: string[];
  notes?: string;
  createdBy: string; // User ID who created this provider
  updatedBy: string; // User ID who last updated this provider
};

// New types for service provider management
export type ServiceProviderCreateRequest = Omit<
  Provider,
  "id" | "createdAt" | "updatedAt" | "lastActive" | "createdBy" | "updatedBy"
>;

export type ServiceProviderUpdateRequest = Partial<
  Omit<Provider, "id" | "createdAt" | "createdBy"> & {
    updatedBy: string;
  }
>;

export type ServiceProviderSearchParams = {
  q?: string;
  propertyId?: string;
  service?: string;
  status?: Provider["status"];
  serviceCategories?: string[];
  serviceAreas?: string[];
  rating?: number;
  complianceStatus?: boolean;
  availability?: {
    day: string;
    time: string;
  };
};

export type ServiceProviderFinancialData = {
  providerId: string;
  periodFrom: string;
  periodTo: string;
  granularity: PeriodGranularity;
  revenue: number;
  expenses?: number;
  profit?: number;
  marginPct?: number;
  invoices: {
    total: number;
    paid: number;
    overdue: number;
    pending: number;
  };
  payments: {
    total: number;
    processed: number;
    failed: number;
    pending: number;
  };
  trend?: Array<{
    label: string;
    revenue: number;
    profit?: number;
    invoices: number;
  }>;
};

export type PeriodGranularity = "WEEK" | "MONTH" | "YEAR";

export type PropertyFinancialAggregate = {
  propertyId: string;
  propertyName: string;
  periodFrom: string; // ISO
  periodTo: string; // ISO
  granularity: PeriodGranularity;
  currency: "ZAR" | "EUR" | "USD";
  // totals
  revenue: number; // gross inflows from all providers at property
  expenses?: number; // optional (fees/opex if modeled)
  profit?: number; // revenue - expenses
  marginPct?: number; // profit / revenue
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

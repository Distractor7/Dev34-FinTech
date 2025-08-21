export type Property = {
  id: string;
  tenantId?: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    fullAddress: string;
  };
  status: "active" | "inactive";
  propertyType: string;
  squareFootage: number;
  yearBuilt: number;
  description: string;
  amenities: string[];
  contactInfo: {
    phone: string;
    email: string;
    manager: string;
    emergencyContact: string;
  };
  financialInfo: {
    purchasePrice: number;
    currentValue: number;
    monthlyRent: number;
    propertyTax: number;
    insurance: number;
    monthlyExpenses: number;
  };
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  metadata: {
    tags: string[];
    features: string[];
    restrictions: string[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
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
  businessName: string;
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
    monday: { start: string | null; end: string | null };
    tuesday: { start: string | null; end: string | null };
    wednesday: { start: string | null; end: string | null };
    thursday: { start: string | null; end: string | null };
    friday: { start: string | null; end: string | null };
    saturday: { start: string | null; end: string | null };
    sunday: { start: string | null; end: string | null };
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
  createdBy: string;
  updatedBy: string;
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

export type Invoice = {
  id: string;
  invoiceNumber: string;
  propertyId: string; // Links to Property.id
  providerId: string; // Links to Provider.id

  // Invoice Details
  description: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";

  // Financial Information
  subtotal: number;
  tax: number;
  total: number;
  currency: string;

  // Line Items
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    category?: string;
    notes?: string;
  }[];

  // Additional Information
  notes?: string;
  terms?: string;
  paymentInstructions?: string;

  // Payment Tracking
  paidDate?: string;
  paymentMethod?: string;
  paymentReference?: string;

  // Audit Trail
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;

  // Metadata for Searchability
  tags?: string[];
  category?: string;
  priority?: "low" | "medium" | "high";

  // Approval Workflow
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;

  // Document Attachments
  attachments?: {
    filename: string;
    url: string;
    type: string;
    uploadedAt: string;
  }[];
};

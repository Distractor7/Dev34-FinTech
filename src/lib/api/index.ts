import {
  Provider,
  Property,
  PeriodGranularity,
  PropertyRankItem,
  PropertyFinancialAggregate,
} from "@/types/float34";
import { InvoiceApi } from "./invoiceApi";

export interface Float34Api {
  listProviders(params?: {
    q?: string;
    propertyId?: string;
  }): Promise<Provider[]>;
  listProperties(): Promise<Property[]>;
  getPropertyFinancials(params: {
    propertyId?: string; // if omitted => all properties rolled-up list
    from: string; // ISO start
    to: string; // ISO end
    granularity: PeriodGranularity;
  }): Promise<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    };
    byProperty: PropertyRankItem[]; // ranked list
    series?: PropertyFinancialAggregate[]; // one per property OR one (if propertyId specified)
  }>;
  getServiceProviderFinancials(params: {
    providerId?: string; // if omitted => all providers rolled-up list
    from: string; // ISO start
    to: string; // ISO end
    granularity: PeriodGranularity;
  }): Promise<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    };
    byProvider: any[]; // ranked list
    series?: any[]; // one per provider OR one (if providerId specified)
  }>;
  // New method for combined filtering
  getCombinedFinancials(params: {
    propertyId?: string;
    providerId?: string;
    from: string;
    to: string;
    granularity: PeriodGranularity;
  }): Promise<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    };
    byProperty: PropertyRankItem[];
    byProvider: any[];
    series?: any[];
    combinedData?: {
      propertyName: string;
      providerName: string;
      revenue: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    }[];
  }>;
}

export function getApi(): Float34Api {
  // Now using real invoice data from Firebase instead of mock data
  return new InvoiceApi();
}

import { Provider, Property } from "@/types/float34";
import { MockApi } from "./mock";

export interface Float34Api {
  listProviders(params?: {
    q?: string;
    propertyId?: string;
  }): Promise<Provider[]>;
  listProperties(): Promise<Property[]>;
  getPropertyFinancials(params: {
    propertyId?: string;        // if omitted => all properties rolled-up list
    from: string;               // ISO start
    to: string;                 // ISO end
    granularity: PeriodGranularity;
  }): Promise<{
    summary: {
      revenue: number;
      expenses?: number;
      profit?: number;
      marginPct?: number;
      invoicesPaidPct?: number;
    };
    byProperty: PropertyRankItem[];             // ranked list
    series?: PropertyFinancialAggregate[];      // one per property OR one (if propertyId specified)
  }>;
}

export function getApi(): Float34Api {
  // For now, return mock API. Later this will switch to Firebase
  return new MockApi();
}

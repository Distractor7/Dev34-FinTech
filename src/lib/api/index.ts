import { Provider, Property } from "@/types/float34";

export interface Float34Api {
  listProviders(params?: { q?: string; propertyId?: string }): Promise<Provider[]>;
  listProperties(): Promise<Property[]>;
}

export function getApi(): Float34Api {
  // For now, return mock API. Later this will switch to Firebase
  return new MockApi();
}

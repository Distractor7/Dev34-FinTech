import { Float34Api } from "./index";
import { Provider, Property } from "@/types/float34";
import { properties, providers } from "@/mocks/fixtures";

// Simulate network delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockApi implements Float34Api {
  async listProperties(): Promise<Property[]> {
    await sleep(100);
    return properties;
  }

  async listProviders(params?: {
    q?: string;
    propertyId?: string;
  }): Promise<Provider[]> {
    let items = providers;

    if (params?.propertyId) {
      items = items.filter((p) => p.propertyIds.includes(params.propertyId!));
    }

    if (params?.q) {
      const q = params.q.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.service.toLowerCase().includes(q)
      );
    }

    await sleep(150);
    return items;
  }
}

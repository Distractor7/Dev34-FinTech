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

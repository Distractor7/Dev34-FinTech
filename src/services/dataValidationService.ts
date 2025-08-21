import { Property, Provider, Invoice } from "../types/float34";

export class DataValidationService {
  /**
   * Validate property data structure
   */
  static validateProperty(property: Partial<Property>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!property.name) errors.push("Property name is required");
    if (!property.address) errors.push("Property address is required");
    if (!property.propertyType) errors.push("Property type is required");
    if (!property.status) errors.push("Property status is required");

    // Address validation
    if (property.address) {
      if (!property.address.street) errors.push("Street address is required");
      if (!property.address.city) errors.push("City is required");
      if (!property.address.state) errors.push("State is required");
      if (!property.address.zipCode) errors.push("ZIP code is required");
      if (!property.address.country) errors.push("Country is required");
    }

    // Financial validation
    if (property.financialInfo) {
      if (property.financialInfo.purchasePrice < 0) {
        errors.push("Purchase price cannot be negative");
      }
      if (property.financialInfo.currentValue < 0) {
        errors.push("Current value cannot be negative");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate service provider data structure
   */
  static validateProvider(provider: Partial<Provider>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!provider.name) errors.push("Provider name is required");
    if (!provider.email) errors.push("Provider email is required");
    if (!provider.phone) errors.push("Provider phone is required");
    if (!provider.service) errors.push("Provider service is required");
    if (!provider.status) errors.push("Provider status is required");
    if (!provider.businessName) errors.push("Business name is required");
    if (!provider.propertyIds || provider.propertyIds.length === 0) {
      errors.push("Provider must be associated with at least one property");
    }

    // Email validation
    if (provider.email && !this.isValidEmail(provider.email)) {
      errors.push("Invalid email format");
    }

    // Phone validation
    if (provider.phone && !this.isValidPhone(provider.phone)) {
      errors.push("Invalid phone format");
    }

    // Rating validation
    if (provider.rating && (provider.rating < 0 || provider.rating > 5)) {
      errors.push("Rating must be between 0 and 5");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate invoice data structure
   */
  static validateInvoice(invoice: Partial<Invoice>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!invoice.invoiceNumber) errors.push("Invoice number is required");
    if (!invoice.propertyId) errors.push("Property ID is required");
    if (!invoice.providerId) errors.push("Provider ID is required");
    if (!invoice.description) errors.push("Invoice description is required");
    if (!invoice.issueDate) errors.push("Issue date is required");
    if (!invoice.dueDate) errors.push("Due date is required");
    if (!invoice.status) errors.push("Invoice status is required");
    if (!invoice.subtotal) errors.push("Subtotal is required");
    if (!invoice.total) errors.push("Total is required");
    if (!invoice.currency) errors.push("Currency is required");

    // Financial validation
    if (invoice.subtotal && invoice.subtotal < 0) {
      errors.push("Subtotal cannot be negative");
    }
    if (invoice.total && invoice.total < 0) {
      errors.push("Total cannot be negative");
    }
    if (invoice.tax && invoice.tax < 0) {
      errors.push("Tax cannot be negative");
    }

    // Date validation
    if (invoice.issueDate && invoice.dueDate) {
      const issueDate = new Date(invoice.issueDate);
      const dueDate = new Date(invoice.dueDate);
      if (issueDate > dueDate) {
        errors.push("Issue date cannot be after due date");
      }
    }

    // Line items validation
    if (invoice.lineItems && invoice.lineItems.length > 0) {
      invoice.lineItems.forEach((item, index) => {
        if (!item.description) {
          errors.push(`Line item ${index + 1}: description is required`);
        }
        if (item.quantity <= 0) {
          errors.push(
            `Line item ${index + 1}: quantity must be greater than 0`
          );
        }
        if (item.unitPrice < 0) {
          errors.push(`Line item ${index + 1}: unit price cannot be negative`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate relationships between entities
   */
  static validateRelationships(
    properties: Property[],
    providers: Provider[],
    invoices: Invoice[]
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const propertyIds = new Set(properties.map((p) => p.id));
    const providerIds = new Set(providers.map((p) => p.id));

    // Validate invoice property references
    invoices.forEach((invoice) => {
      if (!propertyIds.has(invoice.propertyId)) {
        errors.push(
          `Invoice ${invoice.invoiceNumber}: Property ID ${invoice.propertyId} not found`
        );
      }
      if (!providerIds.has(invoice.providerId)) {
        errors.push(
          `Invoice ${invoice.invoiceNumber}: Provider ID ${invoice.providerId} not found`
        );
      }
    });

    // Validate provider property references
    providers.forEach((provider) => {
      provider.propertyIds.forEach((propertyId) => {
        if (!propertyIds.has(propertyId)) {
          errors.push(
            `Provider ${provider.name}: Property ID ${propertyId} not found`
          );
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for duplicate invoice numbers
   */
  static checkDuplicateInvoiceNumbers(invoices: Invoice[]): {
    hasDuplicates: boolean;
    duplicates: string[];
  } {
    const invoiceNumbers = invoices.map((inv) => inv.invoiceNumber);
    const duplicates = invoiceNumbers.filter(
      (num, index) => invoiceNumbers.indexOf(num) !== index
    );

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates: [...new Set(duplicates)],
    };
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
  }
}

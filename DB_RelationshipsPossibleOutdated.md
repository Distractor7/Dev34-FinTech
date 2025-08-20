# 🗄️ Flow34 Database Structure & Relationships

## 📊 **Collection Overview**

```
Firestore Database
├── users/                    # User accounts & profiles
├── properties/              # Real estate properties
├── serviceProviders/        # Service companies
├── invoices/                # Financial transactions
├── financialData/           # Aggregated financial reports
├── auditLogs/               # System activity tracking
├── apiKeys/                 # API access management
└── serviceRequests/         # Service work orders
```

## 🔗 **Core Relationships**

### **1. Users → Properties (One-to-Many)**

```
users/{userId}
├── role: "property_manager" | "admin" | "owner"
├── tenantId: "tenant_1"
└── properties: ["prop_kny_mall", "prop_office_bldg"]

properties/{propertyId}
├── tenantId: "tenant_1"           ← Links to user
├── name: "Knysna Mall"
├── status: "active"
└── createdAt: timestamp
```

**Relationship:** Each user can manage multiple properties through `tenantId`

### **2. Properties → Invoices (One-to-Many)**

```
properties/{propertyId}
├── id: "prop_kny_mall"
├── name: "Knysna Mall"
└── status: "active"

invoices/{invoiceId}
├── propertyId: "prop_kny_mall"    ← Links to property
├── providerId: "prov_parking_plus"
├── total: 1375
└── status: "draft"
```

**Relationship:** Each property can have multiple invoices through `propertyId`

### **3. Service Providers → Invoices (One-to-Many)**

```
serviceProviders/{providerId}
├── id: "prov_parking_plus"
├── name: "Parking Plus Services"
├── propertyIds: ["prop_kny_mall"]  ← Links to properties
└── status: "active"

invoices/{invoiceId}
├── providerId: "prov_parking_plus"  ← Links to provider
├── propertyId: "prop_kny_mall"
└── total: 1375
```

**Relationship:** Each provider can have multiple invoices through `providerId`

### **4. Invoices → Financial Data (Many-to-One)**

```
invoices/{invoiceId}
├── propertyId: "prop_kny_mall"
├── providerId: "prov_parking_plus"
├── total: 1375
├── status: "draft"
└── issueDate: timestamp

financialData/{periodId}
├── period: "2025-08"
├── propertyId: "prop_kny_mall"
├── revenue: 1375                 ← Calculated from invoices
├── expenses: 412.5               ← Calculated (30% of revenue)
└── profit: 962.5                 ← Calculated (revenue - expenses)
```

**Relationship:** Financial data is aggregated from individual invoices

## 🎯 **Data Flow for Financial Reports**

### **Step 1: Fetch Invoices**

```typescript
// Get all invoices in date range
const invoices = await getInvoicesInDateRange(fromDate, toDate);
// Result: [{ id: "invoice_001", propertyId: "prop_kny_mall", total: 1375 }]
```

### **Step 2: Fetch Properties**

```typescript
// Get all properties
const properties = await getAllProperties();
// Result: [{ id: "prop_kny_mall", name: "Knysna Mall" }]
```

### **Step 3: Link Data**

```typescript
// Match invoices to properties
invoices.forEach((invoice) => {
  const property = properties.find((p) => p.id === invoice.propertyId);
  if (property) {
    property.revenue += invoice.total; // Link successful
  } else {
    console.warn(`Orphaned invoice: ${invoice.id}`); // Link failed
  }
});
```

### **Step 4: Calculate Financials**

```typescript
// Calculate derived values
properties.forEach((property) => {
  property.expenses = property.revenue * 0.3; // 30% assumption
  property.profit = property.revenue - property.expenses;
  property.marginPct = (property.profit / property.revenue) * 100;
});
```

## ⚠️ **Critical Relationship Rules**

### **1. Property ID Must Exist**

```typescript
// ❌ WRONG - Invoice references non-existent property
{
  propertyId: "non_existent_property",  // This will cause $0.00 revenue
  total: 1375
}

// ✅ CORRECT - Property exists
{
  propertyId: "prop_kny_mall",          // Property exists in properties collection
  total: 1375
}
```

### **2. Provider ID Must Exist**

```typescript
// ❌ WRONG - Invoice references non-existent provider
{
  providerId: "non_existent_provider",  // This will cause provider lookup failures
  propertyId: "prop_kny_mall"
}

// ✅ CORRECT - Provider exists
{
  providerId: "prov_parking_plus",      // Provider exists in serviceProviders collection
  propertyId: "prop_kny_mall"
}
```

### **3. Tenant ID Must Match**

```typescript
// ❌ WRONG - Property belongs to different tenant
{
  tenantId: "tenant_2",                 // User can't access this property
  name: "Knysna Mall"
}

// ✅ CORRECT - Property belongs to user's tenant
{
  tenantId: "tenant_1",                 // User can access this property
  name: "Knysna Mall"
}
```

## 🔧 **Why Your Data Got Cleared**

### **What Happened:**

1. **Clear Data Button** deleted ALL documents with IDs starting with:
   - `sample-` (sample properties/providers)
   - `INV-` (sample invoices)
2. **But it also deleted** your real invoice because it had `invoiceNumber: "INV-2024-001"`

### **The Problem:**

```typescript
// Clear Data logic was too aggressive
invoices.forEach((invoice) => {
  if (invoice.invoiceNumber && invoice.invoiceNumber.startsWith("INV-")) {
    // This caught your real invoice "INV-2024-001"!
    batch.delete(docRef);
  }
});
```

## 🚀 **How to Fix This Properly**

### **Option 1: Restore Your Real Data**

```typescript
// Manually recreate your real invoice
{
  id: "invoice_001",
  invoiceNumber: "INV-2024-001",
  propertyId: "prop_kny_mall",
  providerId: "prov_parking_plus",
  total: 1375,
  status: "draft"
}
```

### **Option 2: Better Clear Data Logic**

```typescript
// Only delete sample data, not real data
if (
  invoice.id.startsWith("sample-") ||
  (invoice.invoiceNumber && invoice.invoiceNumber.startsWith("SAMPLE-INV-"))
) {
  // Safe to delete
}
```

## 📋 **Current Status Check**

### **What You Should Have:**

- ✅ **Properties Collection:** `prop_kny_mall` (Knysna Mall)
- ✅ **Providers Collection:** `prov_parking_plus` (Parking Plus Services)
- ❌ **Invoices Collection:** Empty (your real invoice was deleted)

### **What You Need to Recreate:**

- **Invoice:** `invoice_001` with your real data
- **Property:** `prop_kny_mall` if it doesn't exist
- **Provider:** `prov_parking_plus` if it doesn't exist

## 🎯 **Next Steps**

1. **Click 🐛 Debug** to see current database state
2. **Recreate your real invoice** with proper property/provider links
3. **Verify relationships** are working correctly

The buttons I created are indeed for testing CRUD operations, but they need to be smarter about preserving real data while clearing only sample data! 💪

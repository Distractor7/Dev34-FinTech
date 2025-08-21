// Test script to seed comprehensive test data
// Run this with: node test-seed-data.js

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  doc,
  writeBatch,
  getDocs,
} = require("firebase/firestore");

// Your Firebase config (you'll need to add your actual config here)
const firebaseConfig = {
  // Add your Firebase config here
  // apiKey: "your-api-key",
  // authDomain: "your-project.firebaseapp.com",
  // projectId: "your-project-id",
  // storageBucket: "your-project.appspot.com",
  // messagingSenderId: "your-sender-id",
  // appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test data structure
const testData = [
  // January 2024 - Cleaning Services
  {
    invoiceNumber: "INV-2024-001",
    propertyId: "sample-property-1",
    providerId: "prov_cleaningServices_plus",
    description: "Monthly cleaning services - January 2024",
    issueDate: new Date(2024, 0, 15).toISOString(), // Jan 15, 2024
    dueDate: new Date(2024, 1, 15).toISOString(), // Feb 15, 2024
    status: "paid",
    subtotal: 1200.0,
    tax: 120.0,
    total: 1320.0,
    lineItems: [
      {
        description: "General cleaning",
        quantity: 1,
        unitPrice: 800.0,
        total: 800.0,
      },
      {
        description: "Window cleaning",
        quantity: 1,
        unitPrice: 400.0,
        total: 400.0,
      },
    ],
    notes: "Monthly cleaning services for January",
    paidDate: new Date(2024, 1, 10).toISOString(),
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // February 2024 - Fiber Internet
  {
    invoiceNumber: "INV-2024-002",
    propertyId: "sample-property-2",
    providerId: "prov_fibreInt_plus",
    description:
      "Fiber internet installation and monthly service - February 2024",
    issueDate: new Date(2024, 1, 20).toISOString(), // Feb 20, 2024
    dueDate: new Date(2024, 2, 20).toISOString(), // Mar 20, 2024
    status: "paid",
    subtotal: 2500.0,
    tax: 250.0,
    total: 2750.0,
    lineItems: [
      {
        description: "Fiber installation",
        quantity: 1,
        unitPrice: 2000.0,
        total: 2000.0,
      },
      {
        description: "Monthly service",
        quantity: 1,
        unitPrice: 500.0,
        total: 500.0,
      },
    ],
    notes: "Fiber internet setup and first month service",
    paidDate: new Date(2024, 2, 15).toISOString(),
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // March 2024 - Parking Services
  {
    invoiceNumber: "INV-2024-003",
    propertyId: "sample-property-1",
    providerId: "prov_parking_plus",
    description: "Parking lot maintenance and security - March 2024",
    issueDate: new Date(2024, 2, 10).toISOString(), // Mar 10, 2024
    dueDate: new Date(2024, 3, 10).toISOString(), // Apr 10, 2024
    status: "paid",
    subtotal: 1800.0,
    tax: 180.0,
    total: 1980.0,
    lineItems: [
      {
        description: "Parking lot cleaning",
        quantity: 1,
        unitPrice: 600.0,
        total: 600.0,
      },
      {
        description: "Security monitoring",
        quantity: 30,
        unitPrice: 40.0,
        total: 1200.0,
      },
    ],
    notes: "Monthly parking services for March",
    paidDate: new Date(2024, 3, 5).toISOString(),
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // April 2024 - Cleaning Services
  {
    invoiceNumber: "INV-2024-004",
    propertyId: "sample-property-2",
    providerId: "prov_cleaningServices_plus",
    description: "Deep cleaning and maintenance - April 2024",
    issueDate: new Date(2024, 3, 5).toISOString(), // Apr 5, 2024
    dueDate: new Date(2024, 4, 5).toISOString(), // May 5, 2024
    status: "sent",
    subtotal: 1500.0,
    tax: 150.0,
    total: 1650.0,
    lineItems: [
      {
        description: "Deep cleaning",
        quantity: 1,
        unitPrice: 1000.0,
        total: 1000.0,
      },
      {
        description: "Carpet cleaning",
        quantity: 1,
        unitPrice: 500.0,
        total: 500.0,
      },
    ],
    notes: "Quarterly deep cleaning service",
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // May 2024 - Fiber Internet
  {
    invoiceNumber: "INV-2024-005",
    propertyId: "sample-property-1",
    providerId: "prov_fibreInt_plus",
    description: "Monthly fiber internet service - May 2024",
    issueDate: new Date(2024, 4, 15).toISOString(), // May 15, 2024
    dueDate: new Date(2024, 5, 15).toISOString(), // Jun 15, 2024
    status: "paid",
    subtotal: 500.0,
    tax: 50.0,
    total: 550.0,
    lineItems: [
      {
        description: "Monthly fiber service",
        quantity: 1,
        unitPrice: 500.0,
        total: 500.0,
      },
    ],
    notes: "Monthly fiber internet service",
    paidDate: new Date(2024, 5, 10).toISOString(),
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // June 2024 - Parking Services
  {
    invoiceNumber: "INV-2024-006",
    propertyId: "sample-property-2",
    providerId: "prov_parking_plus",
    description: "Parking lot maintenance - June 2024",
    issueDate: new Date(2024, 5, 20).toISOString(), // Jun 20, 2024
    dueDate: new Date(2024, 6, 20).toISOString(), // Jul 20, 2024
    status: "overdue",
    subtotal: 1600.0,
    tax: 160.0,
    total: 1760.0,
    lineItems: [
      {
        description: "Parking lot maintenance",
        quantity: 1,
        unitPrice: 1000.0,
        total: 1000.0,
      },
      {
        description: "Security services",
        quantity: 30,
        unitPrice: 20.0,
        total: 600.0,
      },
    ],
    notes: "Monthly parking services for June",
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // July 2024 - Cleaning Services
  {
    invoiceNumber: "INV-2024-007",
    propertyId: "sample-property-1",
    providerId: "prov_cleaningServices_plus",
    description: "Monthly cleaning services - July 2024",
    issueDate: new Date(2024, 6, 10).toISOString(), // Jul 10, 2024
    dueDate: new Date(2024, 7, 10).toISOString(), // Aug 10, 2024
    status: "draft",
    subtotal: 1200.0,
    tax: 120.0,
    total: 1320.0,
    lineItems: [
      {
        description: "General cleaning",
        quantity: 1,
        unitPrice: 800.0,
        total: 800.0,
      },
      {
        description: "Window cleaning",
        quantity: 1,
        unitPrice: 400.0,
        total: 400.0,
      },
    ],
    notes: "Monthly cleaning services for July",
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // August 2024 - Fiber Internet
  {
    invoiceNumber: "INV-2024-008",
    propertyId: "sample-property-2",
    providerId: "prov_fibreInt_plus",
    description: "Monthly fiber internet service - August 2024",
    issueDate: new Date(2024, 7, 15).toISOString(), // Aug 15, 2024
    dueDate: new Date(2024, 8, 15).toISOString(), // Sep 15, 2024
    status: "sent",
    subtotal: 500.0,
    tax: 50.0,
    total: 550.0,
    lineItems: [
      {
        description: "Monthly fiber service",
        quantity: 1,
        unitPrice: 500.0,
        total: 500.0,
      },
    ],
    notes: "Monthly fiber internet service",
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // September 2024 - Parking Services
  {
    invoiceNumber: "INV-2024-009",
    propertyId: "sample-property-1",
    providerId: "prov_parking_plus",
    description: "Parking lot maintenance - September 2024",
    issueDate: new Date(2024, 8, 5).toISOString(), // Sep 5, 2024
    dueDate: new Date(2024, 9, 5).toISOString(), // Oct 5, 2024
    status: "paid",
    subtotal: 1800.0,
    tax: 180.0,
    total: 1980.0,
    lineItems: [
      {
        description: "Parking lot cleaning",
        quantity: 1,
        unitPrice: 600.0,
        total: 600.0,
      },
      {
        description: "Security monitoring",
        quantity: 30,
        unitPrice: 40.0,
        total: 1200.0,
      },
    ],
    notes: "Monthly parking services for September",
    paidDate: new Date(2024, 9, 1).toISOString(),
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // October 2024 - Cleaning Services
  {
    invoiceNumber: "INV-2024-010",
    propertyId: "sample-property-2",
    providerId: "prov_cleaningServices_plus",
    description: "Monthly cleaning services - October 2024",
    issueDate: new Date(2024, 9, 20).toISOString(), // Oct 20, 2024
    dueDate: new Date(2024, 10, 20).toISOString(), // Nov 20, 2024
    status: "paid",
    subtotal: 1200.0,
    tax: 120.0,
    total: 1320.0,
    lineItems: [
      {
        description: "General cleaning",
        quantity: 1,
        unitPrice: 800.0,
        total: 800.0,
      },
      {
        description: "Window cleaning",
        quantity: 1,
        unitPrice: 400.0,
        total: 400.0,
      },
    ],
    notes: "Monthly cleaning services for October",
    paidDate: new Date(2024, 10, 15).toISOString(),
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // November 2024 - Fiber Internet
  {
    invoiceNumber: "INV-2024-011",
    propertyId: "sample-property-1",
    providerId: "prov_fibreInt_plus",
    description: "Monthly fiber internet service - November 2024",
    issueDate: new Date(2024, 10, 15).toISOString(), // Nov 15, 2024
    dueDate: new Date(2024, 11, 15).toISOString(), // Dec 15, 2024
    status: "overdue",
    subtotal: 500.0,
    tax: 50.0,
    total: 550.0,
    lineItems: [
      {
        description: "Monthly fiber service",
        quantity: 1,
        unitPrice: 500.0,
        total: 500.0,
      },
    ],
    notes: "Monthly fiber internet service",
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // December 2024 - Parking Services
  {
    invoiceNumber: "INV-2024-012",
    propertyId: "sample-property-2",
    providerId: "prov_parking_plus",
    description: "Parking lot maintenance - December 2024",
    issueDate: new Date(2024, 11, 10).toISOString(), // Dec 10, 2024
    dueDate: new Date(2025, 0, 10).toISOString(), // Jan 10, 2025
    status: "sent",
    subtotal: 2000.0,
    tax: 200.0,
    total: 2200.0,
    lineItems: [
      {
        description: "Parking lot maintenance",
        quantity: 1,
        unitPrice: 1200.0,
        total: 1200.0,
      },
      {
        description: "Security services",
        quantity: 30,
        unitPrice: 26.67,
        total: 800.0,
      },
    ],
    notes: "Monthly parking services for December",
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function clearExistingInvoices() {
  try {
    console.log("🗑️ Clearing existing invoices...");
    const invoicesRef = collection(db, "invoices");
    const snapshot = await getDocs(invoicesRef);

    if (snapshot.empty) {
      console.log("✅ No existing invoices to clear");
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Cleared ${snapshot.size} existing invoices`);
  } catch (error) {
    console.error("❌ Error clearing invoices:", error);
    throw error;
  }
}

async function seedTestData() {
  try {
    console.log("🌱 Starting comprehensive test data seeding...");

    // First, clear existing invoices
    await clearExistingInvoices();

    // Add all invoices to Firestore
    const batch = writeBatch(db);
    const invoicesRef = collection(db, "invoices");

    for (const invoiceData of testData) {
      const invoiceRef = doc(invoicesRef);
      batch.set(invoiceRef, invoiceData);
    }

    await batch.commit();

    console.log(
      `✅ Successfully seeded ${testData.length} comprehensive test invoices`
    );
    console.log("📊 Test data includes:");
    console.log("   - 12 months of invoices (Jan-Dec 2024)");
    console.log("   - 3 service providers: cleaning, fiber, parking");
    console.log("   - 2 properties: sample-property-1, sample-property-2");
    console.log("   - Various statuses: paid, sent, overdue, draft");
    console.log("   - Total value: $19,420 across all invoices");

    return { success: true, count: testData.length };
  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Run the seeding
if (require.main === module) {
  seedTestData()
    .then((result) => {
      if (result.success) {
        console.log("🎉 Test data seeding completed successfully!");
        process.exit(0);
      } else {
        console.error("💥 Test data seeding failed:", result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("💥 Unexpected error:", error);
      process.exit(1);
    });
}

module.exports = { seedTestData, clearExistingInvoices };

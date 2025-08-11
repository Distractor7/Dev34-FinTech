# Service Provider Management System Setup Guide

## 🔐 **Security-First Architecture**

This system implements enterprise-grade security protocols for managing service providers and their sensitive data.

### **Security Features Implemented:**

1. **Data Encryption**

   - API keys and secrets are encrypted at rest
   - Bank account information is encrypted
   - Sensitive data is decrypted only when needed

2. **Role-Based Access Control (RBAC)**

   - Admin users: Full CRUD access
   - Regular users: Read-only access
   - Custom claims for role management

3. **Firestore Security Rules**

   - Row-level security
   - Data validation at the database level
   - Immutable audit logs
   - Soft delete protection

4. **Input Validation & Sanitization**
   - Client-side validation
   - Server-side validation
   - SQL injection protection
   - XSS prevention

## 🚀 **Quick Start**

### **1. Environment Variables**

Create a `.env.local` file in your project root:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Encryption (Change in production!)
NEXT_PUBLIC_ENCRYPTION_KEY=your_secure_encryption_key_32_chars
```

### **2. Firebase Setup**

#### **Enable Services:**

- Authentication (Email/Password, Google)
- Firestore Database
- Storage
- Functions (optional)

#### **Deploy Security Rules:**

```bash
firebase deploy --only firestore:rules
```

#### **Set Up Authentication:**

1. Go to Firebase Console > Authentication
2. Enable Email/Password sign-in
3. Create admin user with custom claims:

```javascript
// In Firebase Functions or Admin SDK
admin.auth().setCustomUserClaims(uid, {
  role: "admin",
  isAdmin: true,
});
```

### **3. Install Dependencies**

```bash
npm install firebase
npm install @types/firebase
```

## 🏗️ **System Architecture**

### **Data Flow:**

```
Frontend → Service Layer → Security Validation → Encryption → Firestore
                ↓
            Decryption → Security Validation → Frontend
```

### **Collections Structure:**

```
serviceProviders/
├── {providerId}/
│   ├── name, email, phone, service
│   ├── status, rating, propertyIds
│   ├── businessInfo (encrypted)
│   ├── apiConnections (encrypted)
│   ├── financialDetails (encrypted)
│   ├── complianceStatus
│   ├── performanceMetrics
│   └── audit fields (createdAt, updatedAt, etc.)

properties/
├── {propertyId}/
│   ├── name, address, status
│   └── serviceProviderIds

auditLogs/
├── {logId}/
│   ├── action, userId, timestamp
│   ├── resourceType, resourceId
│   └── changes, metadata
```

## 🔧 **API Endpoints**

### **Service Provider Operations:**

```typescript
// Create Provider
POST /api/service-providers
{
  name: string,
  email: string,
  phone: string,
  service: string,
  // ... other fields
}

// Get Providers (with pagination)
GET /api/service-providers?status=active&page=1&limit=20

// Get Provider by ID
GET /api/service-providers/{id}

// Update Provider
PUT /api/service-providers/{id}
{
  name?: string,
  email?: string,
  // ... partial updates
}

// Delete Provider (soft delete)
DELETE /api/service-providers/{id}

// Search Providers
GET /api/service-providers/search?q=cleaning&status=active

// Get Provider Stats
GET /api/service-providers/stats
```

## 🛡️ **Security Best Practices**

### **1. Production Encryption**

Replace the simple encryption with proper libraries:

```typescript
// Install: npm install crypto-js
import CryptoJS from "crypto-js";

export class DataEncryption {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  static encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
  }

  static decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
```

### **2. Rate Limiting**

Implement rate limiting for API endpoints:

```typescript
// Install: npm install express-rate-limit
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api/", limiter);
```

### **3. Input Sanitization**

Use libraries like DOMPurify for additional protection:

```typescript
// Install: npm install dompurify @types/dompurify
import DOMPurify from "dompurify";

const sanitizedInput = DOMPurify.sanitize(userInput);
```

### **4. Audit Logging**

Implement comprehensive audit logging:

```typescript
class AuditLogger {
  static async logAction(
    action: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    changes?: any
  ) {
    await addDoc(collection(db, "auditLogs"), {
      action,
      userId,
      resourceType,
      resourceId,
      changes,
      timestamp: new Date().toISOString(),
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });
  }
}
```

## 📊 **Data Migration**

### **From Mock Data to Firebase:**

1. **Export Current Data:**

```typescript
// In your mock service
const mockProviders = await getApi().listProviders();
console.log(JSON.stringify(mockProviders, null, 2));
```

2. **Transform and Import:**

```typescript
// Transform mock data to new schema
const transformedProviders = mockProviders.map((provider) => ({
  ...provider,
  serviceCategories: [provider.service],
  serviceAreas: [],
  availability: {
    monday: { start: "09:00", end: "17:00", available: true },
    // ... other days
  },
  complianceStatus: {
    backgroundCheck: false,
    drugTest: false,
    safetyTraining: false,
    lastUpdated: new Date().toISOString(),
  },
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastActive: new Date().toISOString(),
}));

// Import to Firebase
for (const provider of transformedProviders) {
  await ServiceProviderService.createProvider(provider, adminUserId);
}
```

## 🧪 **Testing**

### **Unit Tests:**

```bash
npm test -- --testPathPattern=serviceProvider
```

### **Integration Tests:**

```bash
npm run test:integration
```

### **Security Tests:**

```bash
npm run test:security
```

## 🚨 **Monitoring & Alerts**

### **1. Firebase Monitoring:**

- Set up alerts for failed authentication attempts
- Monitor database read/write operations
- Track function execution times

### **2. Custom Metrics:**

```typescript
// Track sensitive operations
class SecurityMetrics {
  static async trackSensitiveOperation(
    operation: string,
    userId: string,
    success: boolean
  ) {
    // Send to monitoring service
    console.log(
      `Security Operation: ${operation} by ${userId} - ${
        success ? "SUCCESS" : "FAILED"
      }`
    );
  }
}
```

### **3. Error Tracking:**

```typescript
// Install: npm install @sentry/nextjs
import * as Sentry from "@sentry/nextjs";

try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

## 🔄 **Deployment Checklist**

- [ ] Environment variables configured
- [ ] Firebase services enabled
- [ ] Security rules deployed
- [ ] Admin user created with proper claims
- [ ] Encryption key set and secure
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Error tracking configured
- [ ] Monitoring alerts set up
- [ ] Data migration completed
- [ ] Security testing passed
- [ ] Performance testing completed

## 📚 **Additional Resources**

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication Best Practices](https://firebase.google.com/docs/auth/best-practices)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Data Encryption Standards](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf)

## 🆘 **Support & Troubleshooting**

### **Common Issues:**

1. **Permission Denied Errors:**

   - Check user authentication status
   - Verify custom claims are set correctly
   - Ensure security rules are deployed

2. **Encryption Errors:**

   - Verify encryption key is set
   - Check data format before encryption
   - Ensure consistent encryption/decryption methods

3. **Performance Issues:**
   - Implement proper indexing
   - Use pagination for large datasets
   - Monitor query performance

### **Getting Help:**

- Check Firebase Console logs
- Review security rules syntax
- Test with Firebase Emulator
- Consult Firebase documentation

---

**⚠️ Security Note:** This system handles sensitive business data. Always follow security best practices and regularly audit your security measures.

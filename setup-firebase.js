#!/usr/bin/env node

/**
 * Firebase Setup Script
 * Run this script to help configure your Firebase project
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 Firebase Setup Helper\n");

// Check if .env.local exists
const envPath = path.join(process.cwd(), ".env.local");
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log("❌ .env.local file not found");
  console.log("📝 Creating .env.local template...\n");

  const envTemplate = `# Firebase Configuration
# Get these values from: https://console.firebase.google.com/
# 1. Go to Project Settings (gear icon)
# 2. Scroll down to "Your apps" section
# 3. Click the web app icon or create a new web app
# 4. Copy the configuration values below

NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Encryption Key (Generate a secure 32-character key)
NEXT_PUBLIC_ENCRYPTION_KEY=your_secure_encryption_key_32_chars

# Example of what it should look like:
# NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=myproject-12345.firebaseapp.com
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=myproject-12345
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=myproject-12345.appspot.com
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
# NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log("✅ Created .env.local template");
  console.log("📝 Please edit .env.local with your actual Firebase values\n");
} else {
  console.log("✅ .env.local file found");

  // Read and check the content
  const envContent = fs.readFileSync(envPath, "utf8");
  const hasPlaceholders =
    envContent.includes("your_actual_api_key_here") ||
    envContent.includes("your_project");

  if (hasPlaceholders) {
    console.log("⚠️  .env.local contains placeholder values");
    console.log(
      "📝 Please replace the placeholder values with your actual Firebase configuration\n"
    );
  } else {
    console.log("✅ .env.local appears to be configured\n");
  }
}

console.log("📋 Next Steps:");
console.log("1. Go to https://console.firebase.google.com/");
console.log("2. Create a new project or select existing one");
console.log("3. Enable Authentication (Email/Password)");
console.log("4. Enable Firestore Database");
console.log("5. Create a web app and copy the config values");
console.log("6. Update .env.local with the actual values");
console.log("7. Restart your development server");
console.log("\n🔐 Security Note: Never commit .env.local to version control!");

// Check if .gitignore includes .env.local
const gitignorePath = path.join(process.cwd(), ".gitignore");
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
  if (!gitignoreContent.includes(".env.local")) {
    console.log("\n⚠️  Warning: .env.local is not in .gitignore");
    console.log('   Please add ".env.local" to your .gitignore file');
  }
}

console.log("\n🎯 After setup, you can test the connection by visiting:");
console.log("   http://localhost:3000/dashboard/service-providers");
console.log(
  "\n💡 If you see any errors, check the browser console for details"
);

// Test script to verify OpenAI API key
// Run this with: node test-api.js

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "your-api-key-here";

async function testOpenAI() {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API Key is valid!");
      console.log("Available models:", data.data.map((m) => m.id).slice(0, 5));

      // Check if GPT-5 is available
      const hasGPT5 = data.data.some((m) => m.id.includes("gpt-5"));
      console.log("GPT-5 available:", hasGPT5 ? "✅ Yes" : "❌ No");
    } else {
      console.log("❌ API Key verification failed");
      console.log("Status:", response.status);
      console.log("Error:", await response.text());
    }
  } catch (error) {
    console.log("❌ Error testing API:", error.message);
  }
}

// Check if API key is set
if (OPENAI_API_KEY === "your-api-key-here") {
  console.log("⚠️  Please set your OpenAI API key:");
  console.log('export OPENAI_API_KEY="sk-your-actual-key-here"');
} else {
  testOpenAI();
}




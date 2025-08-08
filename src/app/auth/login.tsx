"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/dashboard/home"); // ✅ navigate on success
    } catch (error: any) {
      console.error("Login error:", error);
      alert("Login failed: " + error.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 24 }}>
      <img
        src="../public/image.png"
        alt="Login Graphic"
        style={{ width: "100%", height: "auto", marginBottom: 20 }}
      />
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>
        Welcome! Please log in
      </h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 6,
          border: "1px solid #ccc",
          marginBottom: 12,
        }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 6,
          border: "1px solid #ccc",
          marginBottom: 20,
        }}
      />
      <button
        onClick={handleLogin}
        style={{
          width: "100%",
          padding: 12,
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontWeight: "bold",
        }}
      >
        Login
      </button>
    </div>
  );
}

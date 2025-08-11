"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("admin"); // "admin" or "service"
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          maxWidth: 500,
          width: "100%",
          padding: 30,
          backgroundColor: "white",
          borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          margin: "0 20px",
        }}
      >
        <img
          src="/flow34.png"
          alt="Login Graphic"
          style={{
            width: "85%",
            height: "auto",
            marginBottom: 8,
            margin: "0 auto 8px auto",
            display: "block",
          }}
        />
        <h2
          style={{
            textAlign: "center",
            marginBottom: 8,
            color: "#333",
            fontSize: "20px",
            fontFamily: "Arial",
          }}
        >
          Welcome! Please log in
        </h2>

        {/* Login Type Selection */}
        <div style={{ marginBottom: 8 }}>
          <label
            style={{
              display: "block",
              marginBottom: 4,
              fontWeight: "bold",
              color: "#555",
              fontSize: "13px",
            }}
          >
            Login Type
          </label>
          <div style={{ display: "flex", gap: 4 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "5px 10px",
                borderRadius: 4,
                border: "1px solid #e1e5e9",
                backgroundColor: loginType === "admin" ? "#0070f3" : "#f8f9fa",
                color: loginType === "admin" ? "white" : "#6c757d",
                fontWeight: loginType === "admin" ? "600" : "500",
                fontSize: "13px",
                transition: "all 0.2s ease",
                flex: 1,
                textAlign: "center",
              }}
            >
              <input
                type="radio"
                name="loginType"
                value="admin"
                checked={loginType === "admin"}
                onChange={(e) => setLoginType(e.target.value)}
                style={{ display: "none" }}
              />
              Dev34
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "5px 10px",
                borderRadius: 4,
                border: "1px solid #e1e5e9",
                backgroundColor:
                  loginType === "service" ? "#0070f3" : "#f8f9fa",
                color: loginType === "service" ? "white" : "#6c757d",
                fontWeight: loginType === "service" ? "600" : "500",
                fontSize: "13px",
                transition: "all 0.2s ease",
                flex: 1,
                textAlign: "center",
              }}
            >
              <input
                type="radio"
                name="loginType"
                value="service"
                checked={loginType === "service"}
                onChange={(e) => setLoginType(e.target.value)}
                style={{ display: "none" }}
              />
              SP
            </label>
          </div>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 4,
            border: "1px solid #ccc",
            marginBottom: 4,
            fontSize: "14px",
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
            borderRadius: 4,
            border: "1px solid #ccc",
            marginBottom: 8,
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: 10,
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) =>
            ((e.target as HTMLButtonElement).style.backgroundColor = "#0051cc")
          }
          onMouseOut={(e) =>
            ((e.target as HTMLButtonElement).style.backgroundColor = "#0070f3")
          }
        >
          Login
        </button>
      </div>
    </div>
  );
}

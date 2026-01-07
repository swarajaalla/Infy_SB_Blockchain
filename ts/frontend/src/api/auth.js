// Use /api proxy path to avoid CORS issues
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export async function loginUser(credentials) {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { error: true, detail: error.detail || "Login failed" };
    }
    
    return response.json();
  } catch (error) {
    console.error("Network error:", error);
    return { error: true, detail: "Network error. Please check if backend is running." };
  }
}

export async function registerUser(payload) {
  try {
    console.log("Registering user with payload:", payload);
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    
    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error("Registration error:", error);
      return { error: true, detail: error.detail || "Registration failed" };
    }
    
    const data = await response.json();
    console.log("Registration successful:", data);
    return data;
  } catch (error) {
    console.error("Network error during registration:", error);
    return { error: true, detail: "Network error. Please check if backend is running." };
  }
}

// Centralized API configuration
// This ensures all API calls use the same base URL
// In Codespaces/dev container, use relative path to leverage Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default API_BASE_URL;

// Helper function to get authorization headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper function for API calls with error handling
export const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
};

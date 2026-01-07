import axios from "axios";

// Use /api proxy path to avoid CORS issues
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Upload a document with automatic hash generation
export const uploadDocument = async (formData, token) => {
  return axios.post(
    `${BASE_URL}/documents/upload`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    }
  );
};

// Get all documents for the authenticated user
export const getDocuments = async (token) => {
  return axios.get(`${BASE_URL}/documents/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
  });
};

// Get a specific document by its hash code
export const getDocumentByHash = async (hash, token) => {
  return axios.get(`${BASE_URL}/documents/hash/${hash}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
  });
};

// Verify document integrity by comparing file hash with stored hash
export const verifyDocument = async (file, hash, token) => {
  const formData = new FormData();
  formData.append("file", file);
  
  return axios.post(
    `${BASE_URL}/documents/verify?hash_code=${hash}`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    }
  );
};

// Get a document by its ID
export const getDocumentById = async (documentId, token) => {
  return axios.get(`${BASE_URL}/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
  });
};

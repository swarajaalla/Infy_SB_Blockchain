import axios from 'axios';

// Use /api proxy path to avoid CORS issues
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function to get auth token
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get all ledger entries with optional filters
 * @param {Object} params - Query parameters
 * @param {number} params.skip - Number of records to skip (pagination)
 * @param {number} params.limit - Maximum number of records to return
 * @param {number} params.document_id - Filter by document ID
 * @param {string} params.event_type - Filter by event type
 */
export const getAllLedgerEntries = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/ledger/entries`, {
      headers: getAuthToken(),
      params,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    throw error;
  }
};

/**
 * Get a specific ledger entry by ID
 * @param {number} entryId - The ledger entry ID
 */
export const getLedgerEntryById = async (entryId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/ledger/entries/${entryId}`, {
      headers: getAuthToken(),
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching ledger entry:', error);
    throw error;
  }
};

/**
 * Get all ledger entries for a specific document (audit trail)
 * @param {number} documentId - The document ID
 */
export const getDocumentLedgerEntries = async (documentId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/ledger/documents/${documentId}/entries`, {
      headers: getAuthToken(),
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching document ledger entries:', error);
    throw error;
  }
};

/**
 * Get ledger statistics for the organization
 */
export const getLedgerStats = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/ledger/stats`, {
      headers: getAuthToken(),
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching ledger stats:', error);
    throw error;
  }
};

/**
 * Create a new ledger entry (manual logging)
 * @param {Object} entryData - The ledger entry data
 * @param {number} entryData.document_id - ID of the document
 * @param {string} entryData.event_type - Type of event (CREATED, UPLOADED, VERIFIED, etc.)
 * @param {string} entryData.description - Optional description of the event
 * @param {string} entryData.hash_before - Hash before the event
 * @param {string} entryData.hash_after - Hash after the event
 * @param {string} entryData.event_metadata - Additional metadata as JSON string
 */
export const createLedgerEntry = async (entryData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/ledger/entries`, entryData, {
      headers: getAuthToken(),
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    throw error;
  }
};

// Event type constants for easy reference
export const EVENT_TYPES = {
  CREATED: 'CREATED',
  UPLOADED: 'UPLOADED',
  VERIFIED: 'VERIFIED',
  ACCESSED: 'ACCESSED',
  MODIFIED: 'MODIFIED',
  SHARED: 'SHARED',
  DELETED: 'DELETED'
};

// Event type display names and colors
export const EVENT_TYPE_CONFIG = {
  CREATED: { label: 'Created', color: 'blue', icon: '📝' },
  UPLOADED: { label: 'Uploaded', color: 'green', icon: '⬆️' },
  VERIFIED: { label: 'Verified', color: 'purple', icon: '✓' },
  ACCESSED: { label: 'Accessed', color: 'yellow', icon: '👁️' },
  MODIFIED: { label: 'Modified', color: 'orange', icon: '✏️' },
  SHARED: { label: 'Shared', color: 'indigo', icon: '🔗' },
  DELETED: { label: 'Deleted', color: 'red', icon: '🗑️' }
};

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDocumentByHash, verifyDocument } from "../api/document";
import Toast, { useToast } from "../components/Toast";

export default function Documents() {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showHashModal, setShowHashModal] = useState(false);
  const [hashInput, setHashInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyHash, setVerifyHash] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(`/api/documents/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentByHash = async (hash) => {
    try {
      setVerifying(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/documents/hash/${hash}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Document not found or access denied");
      }

      const data = await response.json();
      setSelectedDoc(data);
      return data;
    } catch (err) {
      alert(err.message);
      return null;
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('Hash copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyDocument = async () => {
    if (!verifyFile || !verifyHash) {
      addToast('Please select a file and enter hash code', 'warning');
      return;
    }

    try {
      setVerifying(true);
      const token = localStorage.getItem("token");
      const result = await verifyDocument(verifyFile, verifyHash, token);
      
      setVerificationResult(result.data);
      
      if (result.data.is_verified) {
        addToast('Document verified successfully!', 'success');
      } else {
        addToast('Document verification failed!', 'error');
      }
      
      // Keep modal open to show results
    } catch (err) {
      console.error("Verification error:", err);
      const errorMsg = err.response?.data?.detail || "Verification failed";
      setVerificationResult({
        is_verified: false,
        message: errorMsg
      });
      addToast(errorMsg, 'error');
    } finally {
      setVerifying(false);
    }
  };

  const resetVerifyModal = () => {
    setShowVerifyModal(false);
    setVerifyFile(null);
    setVerifyHash("");
    setVerificationResult(null);
  };

  const docTypeIcons = {
    INVOICE: { icon: "📄", color: "blue", label: "Invoice" },
    LOC: { icon: "💳", color: "green", label: "Letter of Credit" },
    BILL_OF_LADING: { icon: "🚢", color: "purple", label: "Bill of Lading" },
    PO: { icon: "🛒", color: "yellow", label: "Purchase Order" },
    COO: { icon: "📜", color: "indigo", label: "Certificate of Origin" },
    INSURANCE_CERT: { icon: "🛡️", color: "red", label: "Insurance Certificate" },
  };

  const filteredDocs = filter === "all" 
    ? documents 
    : documents.filter(doc => doc.doc_type === filter);

  const getDocTypeInfo = (type) => docTypeIcons[type] || { icon: "📄", color: "gray", label: type };

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-extrabold text-white drop-shadow-lg flex items-center space-x-3">
              <span className="text-5xl">📦</span>
              <span>Documents</span>
            </h2>
            <p className="text-purple-100 mt-3 text-lg">Manage and verify your trade documents with blockchain security</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowVerifyModal(true)}
              className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-6 py-4 rounded-2xl hover:from-green-500 hover:to-emerald-600 transition-all duration-300 shadow-xl hover:shadow-emerald-500/50 hover:scale-105 flex items-center space-x-2 font-bold"
            >
              <span className="text-2xl">✅</span>
              <span>Verify Document</span>
            </button>
            <button
              onClick={() => setShowHashModal(true)}
              className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-6 py-4 rounded-2xl hover:from-purple-500 hover:to-pink-600 transition-all duration-300 shadow-xl hover:shadow-pink-500/50 hover:scale-105 flex items-center space-x-2 font-bold"
            >
              <span className="text-2xl">🔑</span>
              <span>Access by Hash</span>
            </button>
            <button
              onClick={() => navigate('/documents/upload')}
              className="bg-white text-purple-600 px-6 py-4 rounded-2xl hover:bg-purple-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center space-x-2 font-bold"
            >
              <span className="text-2xl">+</span>
              <span>Upload New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="group bg-gradient-to-br from-blue-500 to-blue-600 text-white p-7 rounded-2xl shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-2 font-semibold uppercase tracking-wider">Total Documents</p>
              <p className="text-4xl font-extrabold">{documents.length}</p>
            </div>
            <div className="text-6xl opacity-30 group-hover:opacity-50 transition-opacity group-hover:scale-110 transform duration-300">📚</div>
          </div>
        </div>
        <div className="group bg-gradient-to-br from-green-500 to-green-600 text-white p-7 rounded-2xl shadow-2xl hover:shadow-green-500/50 hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-2 font-semibold uppercase tracking-wider">Verified</p>
              <p className="text-4xl font-extrabold">{documents.filter(d => d.hash).length}</p>
            </div>
            <div className="text-6xl opacity-30 group-hover:opacity-50 transition-opacity group-hover:scale-110 transform duration-300">✅</div>
          </div>
        </div>
        <div className="group bg-gradient-to-br from-purple-500 to-purple-600 text-white p-7 rounded-2xl shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-2 font-semibold uppercase tracking-wider">With Hash</p>
              <p className="text-4xl font-extrabold">{documents.filter(d => d.hash).length}</p>
            </div>
            <div className="text-6xl opacity-30 group-hover:opacity-50 transition-opacity group-hover:scale-110 transform duration-300">🔐</div>
          </div>
        </div>
        <div className="group bg-gradient-to-br from-orange-500 to-orange-600 text-white p-7 rounded-2xl shadow-2xl hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-2 font-semibold uppercase tracking-wider">This Month</p>
              <p className="text-4xl font-extrabold">{documents.length}</p>
            </div>
            <div className="text-6xl opacity-30 group-hover:opacity-50 transition-opacity group-hover:scale-110 transform duration-300">📅</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <div className="flex items-center space-x-3 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-6 py-3 rounded-xl transition-all duration-300 whitespace-nowrap font-bold ${
              filter === "all" 
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/50 scale-105" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
            }`}
          >
            All Documents
          </button>
          {Object.entries(docTypeIcons).map(([type, info]) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-6 py-3 rounded-xl transition-all duration-300 whitespace-nowrap flex items-center space-x-2 font-bold ${
                filter === type 
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/50 scale-105" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
              }`}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-4">Loading documents...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow">
          <p className="flex items-center"><span className="text-xl mr-2">⚠️</span>{error}</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No documents found</h3>
          <p className="text-gray-500 mb-6">Start by uploading your first document</p>
          <button
            onClick={() => navigate('/documents/upload')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-lg"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDocs.map((doc, idx) => {
            const typeInfo = getDocTypeInfo(doc.doc_type);
            return (
              <div
                key={doc.id || idx}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                <div className="flex items-center p-6">
                  {/* Icon */}
                  <div className={`bg-gradient-to-br from-${typeInfo.color}-50 to-${typeInfo.color}-100 p-4 rounded-xl mr-4 shadow`}>
                    <span className="text-4xl">{typeInfo.icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-800">{typeInfo.label}</h3>
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                        <span>✓</span><span>Verified</span>
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      Doc #: <span className="font-mono font-medium bg-gray-100 px-2 py-1 rounded">{doc.doc_number || 'N/A'}</span>
                    </p>
                    {doc.hash && (
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 mt-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-500 font-semibold">🔐 SHA-256 Hash</p>
                          <button
                            onClick={() => copyToClipboard(doc.hash)}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center space-x-1"
                          >
                            {copied ? (
                              <><span>✓</span><span>Copied</span></>
                            ) : (
                              <><span>📋</span><span>Copy</span></>
                            )}
                          </button>
                        </div>
                        <p className="font-mono text-xs text-gray-800 break-all">{doc.hash}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    <button 
                      onClick={() => setSelectedDoc(doc)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => {
                        setHashInput(doc.hash);
                        setShowHashModal(true);
                      }}
                      className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition text-sm font-medium"
                    >
                      Access by Hash
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 flex items-center justify-between text-sm text-gray-600 border-t border-gray-200">
                  <span className="flex items-center space-x-1">
                    <span>📅</span>
                    <span>Uploaded: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span>🏢</span>
                    <span>Org: {doc.org_name || 'N/A'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hash Access Modal */}
      {showHashModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                <span>🔑</span>
                <span>Access Document by Hash</span>
              </h3>
              <button
                onClick={() => {
                  setShowHashModal(false);
                  setHashInput("");
                  setSelectedDoc(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Hash Code
              </label>
              <input
                type="text"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="e.g., 6a97d7fd6cb59a859a7e883103e78c0468ae04d2..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Use the hash code you received when uploading the document
              </p>
            </div>

            <button
              onClick={() => fetchDocumentByHash(hashInput)}
              disabled={!hashInput || verifying}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {verifying ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Access Document</span>
                </>
              )}
            </button>

            {/* Document Details */}
            {selectedDoc && (
              <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <h4 className="font-bold text-green-800 mb-4 flex items-center space-x-2">
                  <span>✅</span>
                  <span>Document Found!</span>
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">Document ID</p>
                      <p className="font-mono font-bold text-gray-800">#{selectedDoc.id}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">Type</p>
                      <p className="font-semibold text-gray-800">{selectedDoc.doc_type}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">Number</p>
                      <p className="font-mono text-gray-800">{selectedDoc.doc_number}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">Organization</p>
                      <p className="font-semibold text-gray-800">{selectedDoc.org_name}</p>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">Created</p>
                    <p className="text-gray-800">{new Date(selectedDoc.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                <span>✅</span>
                <span>Verify Document Integrity</span>
              </h3>
              <button
                onClick={resetVerifyModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Hash Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Hash Code
                </label>
                <input
                  type="text"
                  value={verifyHash}
                  onChange={(e) => setVerifyHash(e.target.value)}
                  placeholder="e.g., 6a97d7fd6cb59a859a7e883103e78c0468ae04d2..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File to Verify
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                  {verifyFile ? (
                    <div className="space-y-2">
                      <p className="font-medium text-gray-800">{verifyFile.name}</p>
                      <p className="text-sm text-gray-500">{(verifyFile.size / 1024).toFixed(2)} KB</p>
                      <button
                        type="button"
                        onClick={() => setVerifyFile(null)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">Click to upload file</p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    id="verify-file-upload"
                    onChange={(e) => setVerifyFile(e.target.files[0])}
                  />
                  {!verifyFile && (
                    <label
                      htmlFor="verify-file-upload"
                      className="mt-4 inline-block bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                    >
                      Choose File
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: Upload the original file you want to verify against the stored hash
                </p>
              </div>

              {/* Verify Button */}
              <button
                onClick={handleVerifyDocument}
                disabled={!verifyFile || !verifyHash || verifying}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {verifying ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Verify Document</span>
                  </>
                )}
              </button>

              {/* Verification Result */}
              {verificationResult && (
                <div className={`p-6 rounded-xl border-2 ${
                  verificationResult.is_verified 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                    : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`${
                      verificationResult.is_verified ? 'bg-green-500' : 'bg-red-500'
                    } rounded-full p-2`}>
                      {verificationResult.is_verified ? (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-lg mb-2 ${
                        verificationResult.is_verified ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {verificationResult.is_verified ? '✅ Document Verified!' : '❌ Verification Failed'}
                      </h4>
                      <p className={`text-sm ${
                        verificationResult.is_verified ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {verificationResult.message || (
                          verificationResult.is_verified 
                            ? 'The document matches the stored hash. It has not been tampered with.'
                            : 'The document does not match the stored hash. It may have been modified.'
                        )}
                      </p>
                      {verificationResult.calculated_hash && (
                        <div className="mt-3 bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Calculated Hash:</p>
                          <code className="text-xs font-mono text-gray-800 break-all">
                            {verificationResult.calculated_hash}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

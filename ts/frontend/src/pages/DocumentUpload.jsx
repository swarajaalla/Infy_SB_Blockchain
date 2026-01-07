import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast, { useToast } from "../components/Toast";

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("INVOICE");
  const [docNumber, setDocNumber] = useState("");
  const [tradeId, setTradeId] = useState("");
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch trades on component mount
  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/trades/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTrades(data);
      }
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('Hash copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const docTypes = [
    { value: "INVOICE", label: "Invoice", icon: "📄", color: "blue" },
    { value: "LOC", label: "Letter of Credit", icon: "💳", color: "green" },
    { value: "BILL_OF_LADING", label: "Bill of Lading", icon: "🚢", color: "purple" },
    { value: "PO", label: "Purchase Order", icon: "🛒", color: "yellow" },
    { value: "COO", label: "Certificate of Origin", icon: "📜", color: "indigo" },
    { value: "INSURANCE_CERT", label: "Insurance Certificate", icon: "🛡️", color: "red" }
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated. Please login.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      formData.append("doc_number", docNumber);
      formData.append("issued_at", new Date().toISOString());
      if (tradeId) {
        formData.append("trade_id", tradeId);
      }

      const response = await fetch(`/api/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      setUploadedDoc(data);
      setSuccess(true);
      addToast('Document uploaded successfully!', 'success');
      
      // Store hash in localStorage for future access
      if (data.hash && data.document_id) {
        localStorage.setItem(`doc_${data.document_id}_hash`, data.hash);
      }
      
      // Reset form
      setTimeout(() => {
        navigate('/documents');
      }, 5000);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMsg = err.message || "Failed to upload document";
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedDocType = docTypes.find(dt => dt.value === docType);

  return (
    <div className="max-w-4xl mx-auto">
      <Toast toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={() => navigate(-1)}
          className="text-purple-600 hover:text-purple-700 mb-6 flex items-center space-x-2 font-semibold text-lg transition-all hover:scale-105"
        >
          <span className="text-2xl">←</span>
          <span>Back</span>
        </button>
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8">
          <h2 className="text-4xl font-extrabold text-white drop-shadow-lg flex items-center space-x-3">
            <span className="text-5xl">📤</span>
            <span>Upload Document</span>
          </h2>
          <p className="text-purple-100 mt-3 text-lg">Upload and hash your trade documents securely on the blockchain</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 space-y-7 border border-gray-100">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && uploadedDoc && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-start mb-4">
                  <div className="bg-green-500 rounded-full p-2 mr-3">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-green-800 mb-2">🎉 Document Uploaded Successfully!</h3>
                    <p className="text-green-700 text-sm mb-4">Your document has been securely hashed and stored on the blockchain.</p>
                    
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-700">🔑 Document Hash (Use this to access later)</p>
                          <button
                            onClick={() => copyToClipboard(uploadedDoc.hash)}
                            className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center space-x-1"
                          >
                            {copied ? (
                              <><span>✓</span><span>Copied!</span></>
                            ) : (
                              <><span>📋</span><span>Copy</span></>
                            )}
                          </button>
                        </div>
                        <code className="block bg-gray-50 px-3 py-2 rounded text-xs font-mono text-gray-800 break-all border border-gray-200">
                          {uploadedDoc.hash}
                        </code>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-xs text-gray-500 mb-1">Document ID</p>
                          <p className="font-mono font-bold text-green-700">#{uploadedDoc.document_id}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-xs text-gray-500 mb-1">Document Type</p>
                          <p className="font-semibold text-green-700">{uploadedDoc.doc_type}</p>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          <span className="font-semibold">⭐ Important:</span> Save the hash code above to access this document later!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-green-600 text-center">Redirecting to documents page in 5 seconds...</p>
              </div>
            )}

            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Document Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {docTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setDocType(type.value)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      docType === type.value
                        ? `border-${type.color}-500 bg-${type.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="text-sm font-medium text-gray-800">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Number
              </label>
              <input
                type="text"
                placeholder="e.g., INV-2025-001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                required
              />
            </div>

            {/* Trade Selection (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to Trade (Optional)
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                value={tradeId}
                onChange={(e) => setTradeId(e.target.value)}
              >
                <option value="">No trade (standalone document)</option>
                {trades.map((trade) => (
                  <option key={trade.id} value={trade.id}>
                    {trade.trade_number} - {trade.description} ({trade.status})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                💡 Linking to a trade will automatically update the trade status to DOCUMENTS_UPLOADED
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                {file ? (
                  <div className="space-y-4">
                    {filePreview && (
                      <img src={filePreview} alt="Preview" className="max-h-40 mx-auto rounded" />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFile(null); setFilePreview(null); }}
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
                    <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 10MB</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileChange}
                  required
                />
                {!file && (
                  <label
                    htmlFor="file-upload"
                    className="mt-4 inline-block bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    Choose File
                  </label>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !file}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-5 rounded-2xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 font-extrabold shadow-2xl hover:shadow-pink-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-3 text-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Uploading & Hashing...</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* Selected Document Info */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-7 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-5 text-xl flex items-center space-x-2">
                <span className="text-2xl">📝</span>
                <span>Document Info</span>
              </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{selectedDocType?.icon}</span>
                <div>
                  <p className="text-gray-500 text-xs">Type</p>
                  <p className="font-medium text-gray-800">{selectedDocType?.label}</p>
                </div>
              </div>
              {docNumber && (
                <div>
                  <p className="text-gray-500 text-xs">Number</p>
                  <p className="font-medium text-gray-800">{docNumber}</p>
                </div>
              )}
              {file && (
                <div>
                  <p className="text-gray-500 text-xs">File</p>
                  <p className="font-medium text-gray-800 truncate">{file.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Security Info */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold mb-3 flex items-center space-x-2">
              <span>🔒</span>
              <span>Security Features</span>
            </h3>
            <ul className="space-y-2 text-sm text-blue-50">
              <li className="flex items-start space-x-2">
                <span>✓</span>
                <span>SHA-256 hashing for integrity</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>✓</span>
                <span>Blockchain timestamping</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>✓</span>
                <span>Immutable storage</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>✓</span>
                <span>Encrypted transmission</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

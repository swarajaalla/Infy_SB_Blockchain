import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDocuments } from "../api/document";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    documents: 0,
    verified: 0,
    pending: 0,
    storage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await getDocuments(token);
      const documents = response.data;
      
      // Calculate statistics
      const totalDocs = documents.length;
      const verifiedDocs = documents.filter(doc => doc.hash && doc.hash.length > 0).length;
      const thisMonth = documents.filter(doc => {
        const docDate = new Date(doc.created_at);
        const now = new Date();
        return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
      }).length;
      
      // Estimate storage (rough calculation)
      const estimatedStorage = (totalDocs * 0.5).toFixed(2); // Assume 0.5MB per doc
      
      setStats({
        documents: totalDocs,
        verified: verifiedDocs,
        pending: thisMonth,
        storage: estimatedStorage
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Documents",
      value: stats.documents,
      icon: "📄",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      title: "Verified",
      value: stats.verified,
      icon: "✅",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-600"
    },
    {
      title: "This Month",
      value: stats.pending,
      icon: "📅",
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600"
    },
    {
      title: "Storage Used",
      value: `${stats.storage} MB`,
      icon: "💾",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600"
    }
  ];

  const recentActivities = [
    { type: "upload", doc: "Invoice INV-1001", org: "Acme Corp", time: "2 hours ago", icon: "📤", color: "text-blue-600" },
    { type: "verify", doc: "Bill of Lading BOL-200", org: "ShipCo", time: "5 hours ago", icon: "✓", color: "text-green-600" },
    { type: "share", doc: "Letter of Credit LC-345", org: "Global Bank", time: "1 day ago", icon: "🔗", color: "text-purple-600" },
    { type: "alert", doc: "Risk score updated", org: "Counterparty XYZ", time: "2 days ago", icon: "⚠️", color: "text-yellow-600" }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">Available Features</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-150">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Document List</h4>
                <p className="text-sm text-gray-600">View and manage all your uploaded documents with hash verification.</p>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50/50 transition-all duration-150">
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Document Upload</h4>
                <p className="text-sm text-gray-600">Upload documents with automatic SHA-256 hashing</p>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-150">
            <div className="flex items-start space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Hash Access</h4>
                <p className="text-sm text-gray-600">Access documents securely using their unique hash code</p>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-150">
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-100 p-2 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Role-Based Access</h4>
                <p className="text-sm text-gray-600">Your role: <span className="font-semibold text-gray-800">{user?.role || 'Corporate'}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

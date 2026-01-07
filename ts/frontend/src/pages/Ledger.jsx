import React, { useState, useEffect } from "react";
import { getAllLedgerEntries, getLedgerStats, EVENT_TYPE_CONFIG } from "../api/ledger";
import Loader from "../components/Loader";
import Toast from "../components/Toast";

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  // Filters
  const [filters, setFilters] = useState({
    event_type: "",
    document_id: "",
    limit: 50
  });
  
  // Pagination
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchData();
  }, [skip, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch entries with filters
      const params = {
        skip,
        limit: filters.limit,
        ...(filters.event_type && { event_type: filters.event_type }),
        ...(filters.document_id && { document_id: parseInt(filters.document_id) })
      };
      
      const [entriesData, statsData] = await Promise.all([
        getAllLedgerEntries(params),
        getLedgerStats()
      ]);
      
      setEntries(entriesData);
      setStats(statsData);
      setHasMore(entriesData.length === filters.limit);
    } catch (error) {
      setToast({
        show: true,
        message: error.response?.data?.detail || "Failed to fetch ledger data",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setSkip(0); // Reset pagination when filters change
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventBadgeClass = (eventType) => {
    const config = EVENT_TYPE_CONFIG[eventType] || { color: 'gray' };
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colorMap[config.color] || colorMap.gray;
  };

  if (loading && entries.length === 0) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">⛓️ Ledger Explorer</h2>
        <p className="text-gray-600 mt-2">
          View tamper-proof audit trail of all document lifecycle events
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Total Events</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total_entries}</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Last 24 Hours</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.recent_activity_24h}</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Event Types</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {Object.keys(stats.event_type_breakdown).length}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Active Documents</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {stats.most_active_documents.length}
            </div>
          </div>
        </div>
      )}

      {/* Event Type Breakdown */}
      {stats && stats.event_type_breakdown && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Event Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(stats.event_type_breakdown).map(([eventType, count]) => {
              const config = EVENT_TYPE_CONFIG[eventType] || { label: eventType, icon: '📋' };
              return (
                <div
                  key={eventType}
                  className={`p-3 rounded-lg border text-center ${getEventBadgeClass(eventType)}`}
                >
                  <div className="text-2xl mb-1">{config.icon}</div>
                  <div className="text-xs font-medium">{config.label}</div>
                  <div className="text-lg font-bold">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">🔍 Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type
            </label>
            <select
              value={filters.event_type}
              onChange={(e) => handleFilterChange('event_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document ID
            </label>
            <input
              type="number"
              placeholder="Filter by document ID"
              value={filters.document_id}
              onChange={(e) => handleFilterChange('document_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Results Per Page
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Timeline */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">📜 Event Timeline</h3>
          <p className="text-sm text-gray-600 mt-1">
            Chronological audit trail of all blockchain events
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No ledger entries found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            entries.map((entry, index) => {
              const config = EVENT_TYPE_CONFIG[entry.event_type] || { 
                label: entry.event_type, 
                icon: '📋', 
                color: 'gray' 
              };
              
              return (
                <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${getEventBadgeClass(entry.event_type)}`}>
                        {config.icon}
                      </div>
                      {index < entries.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                      )}
                    </div>
                    
                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getEventBadgeClass(entry.event_type)}`}>
                            {config.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            #{entry.id}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(entry.created_at)}
                        </span>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-gray-900 font-medium">
                          {entry.description || `${config.label} event`}
                        </p>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">User:</span>
                          <span className="ml-2 text-gray-900 font-medium">
                            {entry.user_name || 'Unknown'}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Document:</span>
                          <span className="ml-2 text-gray-900 font-medium">
                            #{entry.document_id}
                            {entry.doc_type && ` (${entry.doc_type})`}
                          </span>
                        </div>
                        
                        {entry.doc_number && (
                          <div>
                            <span className="text-gray-500">Doc #:</span>
                            <span className="ml-2 text-gray-900 font-medium">
                              {entry.doc_number}
                            </span>
                          </div>
                        )}
                        
                        {entry.ip_address && (
                          <div>
                            <span className="text-gray-500">IP:</span>
                            <span className="ml-2 text-gray-900 font-mono text-xs">
                              {entry.ip_address}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {entry.hash_after && (
                        <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Document Hash:</div>
                          <div className="text-xs font-mono text-gray-900 break-all">
                            {entry.hash_after}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Pagination */}
        {entries.length > 0 && (
          <div className="p-6 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setSkip(Math.max(0, skip - filters.limit))}
              disabled={skip === 0}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            
            <span className="text-sm text-gray-600">
              Showing {skip + 1} - {skip + entries.length} entries
            </span>
            
            <button
              onClick={() => setSkip(skip + filters.limit)}
              disabled={!hasMore}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

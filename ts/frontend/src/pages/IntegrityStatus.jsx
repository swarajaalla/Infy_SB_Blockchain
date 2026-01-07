import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function IntegrityStatus() {
  const { user } = useAuth();
  const [checks, setChecks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, PASS, FAIL, PENDING
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch summary
      const summaryRes = await fetch('/api/admin/integrity-checks/summary', { headers });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      // Fetch checks with filter
      const statusParam = filter !== 'ALL' ? `?status=${filter}` : '';
      const checksRes = await fetch(`/api/admin/integrity-checks${statusParam}`, { headers });
      if (checksRes.ok) {
        const checksData = await checksRes.json();
        setChecks(checksData);
      }

      // Fetch alerts
      const alertsRes = await fetch('/api/admin/alerts?acknowledged=false', { headers });
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error('Error fetching integrity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runIntegrityCheck = async () => {
    setRunningCheck(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/run-integrity-check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error running integrity check:', error);
      alert('Failed to run integrity check');
    } finally {
      setRunningCheck(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return 'bg-green-100 text-green-800 border-green-300';
      case 'FAIL': return 'bg-red-100 text-red-800 border-red-300';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Document Integrity Status</h1>
        <button
          onClick={runIntegrityCheck}
          disabled={runningCheck}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg 
                   disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {runningCheck ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Running Check...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Integrity Check
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Total Checks</div>
            <div className="text-2xl font-bold">{summary.total_checks}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Passed</div>
            <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="text-sm text-gray-600">Failed</div>
            <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Pass Rate</div>
            <div className="text-2xl font-bold text-purple-600">{summary.pass_rate}%</div>
          </div>
        </div>
      )}

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-red-800 font-semibold">
                {alerts.length} unacknowledged alert{alerts.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="text-red-600 hover:text-red-800 underline"
            >
              {showAlerts ? 'Hide' : 'Show'} Alerts
            </button>
          </div>
          
          {showAlerts && (
            <div className="mt-4 space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="bg-white rounded-lg p-4 shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-sm text-gray-600">{alert.alert_type}</span>
                      </div>
                      <p className="text-gray-800">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="ml-4 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {['ALL', 'PASS', 'FAIL', 'PENDING'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Integrity Checks Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stored Hash</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Computed Hash</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checked At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {checks.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No integrity checks found. Click "Run Integrity Check" to start.
                </td>
              </tr>
            ) : (
              checks.map(check => (
                <tr key={check.id} className={check.status === 'FAIL' ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{check.document_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {check.check_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(check.status)}`}>
                      {check.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono max-w-xs truncate">
                    {check.stored_hash}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono max-w-xs truncate">
                    {check.computed_hash || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {check.checked_at ? new Date(check.checked_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                    {check.remarks || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

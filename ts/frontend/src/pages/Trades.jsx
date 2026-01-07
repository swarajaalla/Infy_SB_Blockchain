import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Trades() {
  const { user } = useContext(AuthContext);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showAssignBankModal, setShowAssignBankModal] = useState(false);
  const [bankEmail, setBankEmail] = useState("");

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/trades/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTrades(data);
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      INITIATED: "bg-yellow-100 text-yellow-800",
      SELLER_CONFIRMED: "bg-blue-100 text-blue-800",
      DOCUMENTS_UPLOADED: "bg-purple-100 text-purple-800",
      BANK_REVIEWING: "bg-orange-100 text-orange-800",
      BANK_APPROVED: "bg-green-100 text-green-800",
      PAYMENT_RELEASED: "bg-teal-100 text-teal-800",
      COMPLETED: "bg-green-200 text-green-900",
      DISPUTED: "bg-red-100 text-red-800",
      CANCELLED: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const handleStatusUpdate = async (tradeId, newStatus, remarks = "") => {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/trades/${tradeId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus, remarks }),
    });

    if (response.ok) {
      fetchTrades();
      alert(`Trade status updated to ${newStatus}`);
    } else {
      const error = await response.json();
      alert(error.detail || "Failed to update status");
    }
  };

  const handleAssignBank = async () => {
    if (!selectedTrade || !bankEmail) return;

    const token = localStorage.getItem("token");
    const response = await fetch(`/api/trades/${selectedTrade.id}/assign-bank?bank_email=${encodeURIComponent(bankEmail)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      alert("Bank assigned successfully!");
      setShowAssignBankModal(false);
      setBankEmail("");
      fetchTrades();
    } else {
      const error = await response.json();
      alert(error.detail || "Failed to assign bank");
    }
  };

  const getAvailableActions = (trade) => {
    const actions = [];
    const isBuyer = user?.id === trade.buyer_id;
    const isSeller = user?.id === trade.seller_id;
    const isBank = user?.role === "bank";

    if (trade.status === "INITIATED" && isSeller) {
      actions.push({ label: "Confirm Trade", status: "SELLER_CONFIRMED" });
      actions.push({ label: "Cancel", status: "CANCELLED" });
    }
    if (trade.status === "SELLER_CONFIRMED" && isSeller) {
      actions.push({ label: "Upload Documents", status: "DOCUMENTS_UPLOADED" });
    }
    if (trade.status === "DOCUMENTS_UPLOADED" && isBank) {
      actions.push({ label: "Start Review", status: "BANK_REVIEWING" });
    }
    if (trade.status === "BANK_REVIEWING" && isBank) {
      actions.push({ label: "Approve", status: "BANK_APPROVED" });
      actions.push({ label: "Dispute", status: "DISPUTED" });
    }
    if (trade.status === "BANK_APPROVED" && isBank) {
      actions.push({ label: "Release Payment", status: "PAYMENT_RELEASED" });
    }
    if (trade.status === "PAYMENT_RELEASED" && (isBuyer || isSeller)) {
      actions.push({ label: "Mark Complete", status: "COMPLETED" });
    }

    return actions;
  };

  if (loading) return <div className="p-6">Loading trades...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Trade Transactions</h2>
        {user?.role !== "auditor" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Create New Trade
          </button>
        )}
      </div>

      {trades.length === 0 ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          No trades found. Create your first trade to get started!
        </div>
      ) : (
        <div className="grid gap-4">
          {trades.map((trade) => (
            <div key={trade.id} className="bg-white p-4 rounded shadow border hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-blue-600">{trade.trade_number}</h3>
                  <p className="text-sm text-gray-600 mt-1">{trade.description}</p>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Buyer:</span> {trade.buyer.name}
                      <span className="text-gray-500"> ({trade.buyer.org_name})</span>
                    </div>
                    <div>
                      <span className="font-medium">Seller:</span> {trade.seller.name}
                      <span className="text-gray-500"> ({trade.seller.org_name})</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {getAvailableActions(trade).map((action) => (
                      <button
                        key={action.status}
                        onClick={() => handleStatusUpdate(trade.id, action.status)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        {action.label}
                      </button>
                    ))}
                    
                    {/* Assign Bank Button - Only for buyer if no bank assigned */}
                    {user?.id === trade.buyer_id && !trade.bank_id && (
                      <button
                        onClick={() => {
                          setSelectedTrade(trade);
                          setShowAssignBankModal(true);
                        }}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        🏦 Assign Bank
                      </button>
                    )}
                    
                    <button
                      onClick={() => setSelectedTrade(trade)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="text-xl font-bold text-blue-600">
                    {trade.currency} {parseFloat(trade.amount).toLocaleString()}
                  </div>
                  <span className={`mt-2 inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(trade.status)}`}>
                    {trade.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                Created: {new Date(trade.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && <CreateTradeModal onClose={() => setShowCreateModal(false)} onSuccess={fetchTrades} />}
      {selectedTrade && <TradeDetailsModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />}
      {showAssignBankModal && selectedTrade && (
        <AssignBankModal 
          trade={selectedTrade} 
          bankEmail={bankEmail}
          setBankEmail={setBankEmail}
          onClose={() => {
            setShowAssignBankModal(false);
            setBankEmail("");
          }} 
          onAssign={handleAssignBank} 
        />
      )}
    </div>
  );
}

function AssignBankModal({ trade, bankEmail, setBankEmail, onClose, onAssign }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-xl font-bold mb-4">🏦 Assign Bank to Trade</h3>
        <p className="text-sm text-gray-600 mb-4">
          Assign a bank to review and approve this trade: <strong>{trade.trade_number}</strong>
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bank Email Address</label>
            <input
              type="email"
              className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500"
              placeholder="bank@example.com"
              value={bankEmail}
              onChange={(e) => setBankEmail(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the email of the bank user you want to assign
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onAssign}
              disabled={!bankEmail}
              className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign Bank
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 p-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTradeModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    seller_email: "",
    description: "",
    amount: "",
    currency: "USD",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const response = await fetch("/api/trades/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    if (response.ok) {
      onSuccess();
      onClose();
    } else {
      const error = await response.json();
      alert(error.detail || "Failed to create trade");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-xl font-bold mb-4">Create New Trade</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Seller Email</label>
            <input
              type="email"
              className="w-full border p-2 rounded"
              placeholder="seller@example.com"
              value={form.seller_email}
              onChange={(e) => setForm({ ...form, seller_email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border p-2 rounded"
              placeholder="Describe the trade..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                className="w-full border p-2 rounded"
                placeholder="50000.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                className="w-full border p-2 rounded"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
              Create Trade
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 p-2 rounded hover:bg-gray-400">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TradeDetailsModal({ trade, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-2/3 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-bold">{trade.trade_number}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h4 className="font-semibold text-sm text-gray-500">Buyer</h4>
            <p className="font-medium">{trade.buyer.name}</p>
            <p className="text-sm text-gray-600">{trade.buyer.email}</p>
            <p className="text-sm text-gray-600">{trade.buyer.org_name}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500">Seller</h4>
            <p className="font-medium">{trade.seller.name}</p>
            <p className="text-sm text-gray-600">{trade.seller.email}</p>
            <p className="text-sm text-gray-600">{trade.seller.org_name}</p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-semibold mb-2">Description</h4>
          <p className="text-gray-700">{trade.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <h4 className="font-semibold text-sm text-gray-500">Amount</h4>
            <p className="text-lg font-bold text-blue-600">
              {trade.currency} {parseFloat(trade.amount).toLocaleString()}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500">Status</h4>
            <p className="font-medium">{trade.status.replace(/_/g, " ")}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500">Created</h4>
            <p className="text-sm">{new Date(trade.created_at).toLocaleString()}</p>
          </div>
        </div>

        {trade.status_history && trade.status_history.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Status History</h4>
            <div className="space-y-2">
              {trade.status_history.map((history) => (
                <div key={history.id} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50">
                  <div className="font-medium">{history.status.replace(/_/g, " ")}</div>
                  {history.remarks && <div className="text-sm text-gray-600">{history.remarks}</div>}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(history.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

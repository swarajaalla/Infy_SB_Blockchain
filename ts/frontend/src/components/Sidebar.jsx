import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: HomeIcon },
    { path: "/trades", label: "Trades", icon: TradeIcon },
    { path: "/documents", label: "Documents", icon: DocumentIcon },
    { path: "/upload", label: "Upload Document", icon: UploadIcon },
    { path: "/ledger", label: "Ledger Explorer", icon: LedgerIcon },
    { path: "/integrity", label: "Integrity Status", icon: IntegrityIcon },
    { path: "/audit", label: "Audit Logs", icon: AuditIcon },
    { path: "/risk", label: "Risk Analysis", icon: RiskIcon },
  ];

  return (
    <aside className="w-64 h-screen bg-gray-900 text-gray-200 flex flex-col border-r border-gray-800">
      
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">ChainDocs</h1>
            <p className="text-xs text-gray-400">Blockchain Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;

          return (
            <Link
              key={path}
              to={path}
              className={`group flex items-center gap-3 px-4 py-3 rounded-md transition-all
                ${
                  isActive
                    ? "bg-gray-800 text-white border-l-4 border-blue-500"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <Icon active={isActive} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-800 text-xs text-gray-500">
        © 2025 ChainDocs
      </div>
    </aside>
  );
}

/* ---------------- ICONS ---------------- */

function IconWrapper({ children, active }) {
  return (
    <span
      className={`w-5 h-5 ${
        active ? "text-blue-400" : "text-gray-400 group-hover:text-white"
      }`}
    >
      {children}
    </span>
  );
}

function HomeIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h4m10-11v10a1 1 0 01-1 1h-4" />
      </svg>
    </IconWrapper>
  );
}

function DocumentIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          d="M7 2h8l5 5v15a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" />
      </svg>
    </IconWrapper>
  );
}

function UploadIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0l-4 4m4-4l4 4" />
      </svg>
    </IconWrapper>
  );
}

function LedgerIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          d="M9 17v-6h13M9 5v6h13M3 5h2M3 11h2M3 17h2" />
      </svg>
    </IconWrapper>
  );
}

function AuditIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          d="M9 12l2 2 4-4M12 2l7 4v6c0 5-3.5 9.5-7 10-3.5-.5-7-5-7-10V6l7-4z" />
      </svg>
    </IconWrapper>
  );
}

function RiskIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          d="M12 8v4l3 3M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    </IconWrapper>
  );
}

function TradeIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    </IconWrapper>
  );
}

function IntegrityIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </IconWrapper>
  );
}

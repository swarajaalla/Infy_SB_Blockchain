import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: "bg-red-500/10 text-red-400",
      bank: "bg-blue-500/10 text-blue-400",
      corporate: "bg-green-500/10 text-green-400",
      auditor: "bg-purple-500/10 text-purple-400",
    };
    return colors[role] || "bg-gray-500/10 text-gray-400";
  };

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 px-8 flex items-center justify-between">
      
      {/* Left: Page Title */}
      <div>
        <h1 className="text-lg font-semibold text-white">
          Dashboard
        </h1>
        <p className="text-xs text-gray-400">
          Manage your blockchain documents securely
        </p>
      </div>

      {/* Right: User Info */}
      {user && (
        <div className="flex items-center gap-6">
          
          {/* Role Badge */}
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${getRoleBadgeColor(
              user.role
            )}`}
          >
            {user.role}
          </span>

          {/* User Profile */}
          <div className="flex items-center gap-3 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
            
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-white">
                {user.name || user.email.split("@")[0]}
              </span>
              <span className="text-xs text-gray-400">
                {user.email}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="ml-3 text-gray-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navbar */}
        <Navbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-7xl mx-auto px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

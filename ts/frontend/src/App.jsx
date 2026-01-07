import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./context/AuthContext";
import PrivateRoute from "./routes/PrivateRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Trades from "./pages/Trades";
import Documents from "./pages/Documents";
import DocumentUpload from "./pages/DocumentUpload";
import Ledger from "./pages/Ledger";
import Risk from "./pages/Risk";
import Audit from "./pages/Audit";
import IntegrityStatus from "./pages/IntegrityStatus";

import Layout from "./layouts/Layout";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/trades"
            element={
              <PrivateRoute>
                <Layout>
                  <Trades />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <PrivateRoute>
                <Layout>
                  <Documents />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/documents/upload"
            element={
              <PrivateRoute>
                <Layout>
                  <DocumentUpload />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/ledger"
            element={
              <PrivateRoute>
                <Layout>
                  <Ledger />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/risk"
            element={
              <PrivateRoute>
                <Layout>
                  <Risk />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <PrivateRoute>
                <Layout>
                  <Audit />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/integrity"
            element={
              <PrivateRoute>
                <Layout>
                  <IntegrityStatus />
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

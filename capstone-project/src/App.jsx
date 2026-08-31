import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router";
import Sidebar from "./components/Sidebar/Sidebar";
import ClientRecords from "./pages/ClientRecords/ClientRecords";
import Dashboard from "./pages/Dashboard/Dashboard"; 
import HealthDashboard from "./pages/Dashboard/HealthDashboard"; 
import GisMap from "./pages/GisMap/GisMap";
import Reports from "./pages/Reports/Reports";
import Login from "./pages/Login/Login";
import Settings from "./pages/Settings/settings";
import Inventory from "./pages/Inventory/Inventory";
import { auth, onAuthStateChanged } from "./firebase-config";

const NO_SIDEBAR_ROUTES = ["/login"];

function ProtectedRoute({ allowedRole, children }) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setUserRole(localStorage.getItem("userRole"));
      } else {
        setCurrentUser(null);
        setUserRole(null);
        localStorage.removeItem("userRole");
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  if (checkingAuth) {
    return (
      <div style={{ height: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>
        <p style={{ color: "#091F7A", fontWeight: 600, fontSize: "15px" }}>Verifying session...</p>
      </div>
    );
  }

  if (!currentUser || !userRole) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    const fallback = userRole === "health" ? "/dashboard/health" : "/dashboard/cpd";
    return <Navigate to={fallback} replace />;
  }

  return children;
}

function DynamicDashboard() {
  const userRole = localStorage.getItem("userRole") || "cpd"; 
  return userRole === "health" ? <HealthDashboard /> : <Dashboard />;
}

function Layout() {
  const location = useLocation();
  const showSidebar = !NO_SIDEBAR_ROUTES.includes(location.pathname);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {showSidebar && <Sidebar />}
      <main style={{ flex: 1, overflow: "auto" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route 
            path="/dashboard/cpd" 
            element={
              <ProtectedRoute allowedRole="cpd">
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/dashboard/health" 
            element={
              <ProtectedRoute allowedRole="health">
                <HealthDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DynamicDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/client-records" 
            element={
              <ProtectedRoute>
                <ClientRecords />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gis-map" 
            element={
              <ProtectedRoute>
                <GisMap />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
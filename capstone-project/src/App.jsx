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

const NO_SIDEBAR_ROUTES = ["/login"];

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

          <Route path="/dashboard" element={<DynamicDashboard />} />
          <Route path="/dashboard/cpd" element={<Dashboard />} />
          <Route path="/dashboard/health" element={<HealthDashboard />} />

          <Route path="/client-records" element={<ClientRecords />} />
          <Route path="/gis-map" element={<GisMap />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

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
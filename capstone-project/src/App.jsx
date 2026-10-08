import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router";
import Sidebar from "./components/Sidebar/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import Login from "./pages/Login/Login";
import { auth, db, doc, getDoc, onAuthStateChanged } from "./firebase-config";
import "./app-shell.css";

// Each page is downloaded only when it is first opened
const ClientRecords = lazy(() => import("./pages/ClientRecords/ClientRecords"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const HealthDashboard = lazy(() => import("./pages/Dashboard/HealthDashboard"));
const GisMap = lazy(() => import("./pages/GisMap/GisMap"));
const Reports = lazy(() => import("./pages/Reports/Reports"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const Inventory = lazy(() => import("./pages/Inventory/Inventory"));

const NO_SIDEBAR_ROUTES = ["/login"];

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

// Role per signed-in user, read once from their database record
const verifiedRoles = new Map();

async function loadVerifiedRole(user) {
  if (verifiedRoles.has(user.uid)) return verifiedRoles.get(user.uid);

  const snap = await getDoc(doc(db, "users", (user.email || "").toLowerCase()));
  const role = snap.exists() ? snap.data().role : null;
  if (role !== "cpd" && role !== "health") return null;

  verifiedRoles.set(user.uid, role);
  return role;
}

function ProtectedRoute({ allowedRole, children }) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  // keeps the loader on screen long enough to be seen when the session check is instant
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      let role = null;
      if (user) {
        try {
          role = await loadVerifiedRole(user);
        } catch (error) {
          console.error("Could not verify user role:", error);
        }
      } else {
        verifiedRoles.clear();
      }

      // Sidebar reads the role from here, so keep it in step with the verified one
      if (role) localStorage.setItem("userRole", role);
      else localStorage.removeItem("userRole");

      setCurrentUser(user);
      setUserRole(role);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  if (checkingAuth || !minTimePassed) {
    return <PageLoader />;
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

function Layout() {
  const location = useLocation();
  const showSidebar = !NO_SIDEBAR_ROUTES.includes(location.pathname);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {showSidebar && <Sidebar />}
      <main style={{ flex: 1, overflow: "auto" }}>
        <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<PageLoader />}>
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
              <ProtectedRoute allowedRole="health">
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
        </Suspense>
        </ErrorBoundary>
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
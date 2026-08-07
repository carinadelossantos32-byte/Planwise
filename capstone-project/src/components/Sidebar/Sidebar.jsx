import "./sidebar.css";
import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  Map,
  FileBarChart2,
  Settings,
  LogOut,
} from "lucide-react";
<<<<<<< Updated upstream

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Client Records", icon: Users, path: "/client-records" },
  { label: "GIS Map", icon: Map, path: "/gis-map" },
  { label: "Reports", icon: FileBarChart2, path: "/reports" },
];
=======
import { auth, db } from "../../firebase-config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
>>>>>>> Stashed changes

export default function Sidebar() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState("");
  const [userLabel, setUserLabel] = useState("CPD - Office");
  const [userAvatar, setUserAvatar] = useState("C");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.email);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const role = userDocSnap.data().role;
            setUserRole(role);

            if (role === "health") {
              setUserLabel("Health - Office");
              setUserAvatar("H");
            } else {
              setUserLabel("CPD - Office");
              setUserAvatar("C");
            }
          }
        } catch (err) {
          console.error("Error fetching user role for sidebar:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login");
    }
  };

  const dashboardPath = userRole === "health" ? "/dashboard/health" : "/dashboard/cpd";

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: dashboardPath },
    { label: "Client Records", icon: Users, path: "/client-records" },
    { label: "GIS Map", icon: Map, path: "/gis-map" },
    { label: "Inventory", icon: FileText, path: "/inventory" },
    { label: "Reports", icon: FileBarChart2, path: "/reports" },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="logo-wrapper">
          <img
            src="/logo.png"
            alt="Malolos Seal"
            className="logo"
            onError={(e) => {
              e.target.style.display = "none";
              if (e.target.nextSibling) {
                e.target.nextSibling.style.display = "flex";
              }
            }}
          />
          <div className="logo-fallback">
            <span className="logo-fallback-text">M</span>
          </div>
        </div>
        <div>
          <div className="brand-name">PlanWise</div>
          <div className="brand-sub">Malolos</div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={label}
            to={path}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="active-bar" />}
                <Icon size={20} className="nav-icon" />
                <span className="nav-label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="active-bar" />}
              <Settings size={20} className="nav-icon" />
              <span className="nav-label">Settings</span>
            </>
          )}
        </NavLink>

        <div className="user-row">
          <div className="user-avatar">
            <span className="user-avatar-text">{userAvatar}</span>
          </div>
          <div className="user-info">
            <span className="user-name">{userLabel}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Log out">
            <LogOut size={18} className="nav-icon" />
          </button>
        </div>
      </div>
    </aside>
  );
}
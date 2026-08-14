import "./sidebar.css";
import { NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  Map,
  FileBarChart2,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Client Records", icon: Users, path: "/client-records" },
  { label: "GIS Map", icon: Map, path: "/gis-map" },
  { label: "Inventory", icon: FileText, path: "/inventory" },
  { label: "Reports", icon: FileBarChart2, path: "/reports" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const savedUserRole = localStorage.getItem("userRole");

  const getOfficeName = () => {
    if (savedUserRole === "health") return "Health - Office";
    if (savedUserRole === "cpd") return "CPD - Office";

    const path = location.pathname.toLowerCase();

    if (path.includes("health") || path.includes("chc")) {
      return "Health - Office";
    }

    if (path.includes("cpd") || path === "/dashboard") {
      return "CPD - Office";
    }

    return "CPD - Office";
  };

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo-wrapper">
          <img
            src="/logo.png"
            alt="Malolos Seal"
            className="logo"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
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
            key={path}
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
            <span className="user-avatar-text">
              {getOfficeName().charAt(0)}
            </span>
          </div>
          <div className="user-info">
            <span className="user-name">{getOfficeName()}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Log out">
            <LogOut size={18} className="nav-icon" />
          </button>
        </div>
      </div>
    </aside>
  );
}
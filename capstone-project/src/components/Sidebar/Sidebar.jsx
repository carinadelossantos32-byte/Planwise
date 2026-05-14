import "./sidebar.css";
import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  Map,
  FileBarChart2,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Client Records", icon: Users, path: "/client-records" },
  { label: "GIS Map", icon: Map, path: "/gis-map" },
  { label: "Reports", icon: FileBarChart2, path: "/reports" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

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

      {/* Nav Items */}
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

      {/* Bottom Section */}
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

        {/* User / Logout */}
        <div className="user-row">
          <div className="user-avatar">
            <span className="user-avatar-text">C</span>
          </div>
          <div className="user-info">
            <span className="user-name">CPD - Office</span>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Log out">
            <LogOut size={18} className="nav-icon" />
          </button>
        </div>
      </div>
    </aside>
  );
}

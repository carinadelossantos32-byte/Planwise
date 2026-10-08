import { useState } from "react";
import { createPortal } from "react-dom";
import "./sidebar.css";
import "../ClientDeleteModal/client-delete-modal.css";
import { NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  Map,
  FileBarChart2,
  Settings,
  LogOut,
  FileText,
  X,
} from "lucide-react";
import { auth } from "../../firebase-config.js";
import { signOut } from "firebase/auth";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const savedUserRole = (localStorage.getItem("userRole") || "cpd").toLowerCase();
  const dashboardPath = `/dashboard/${savedUserRole === "health" ? "health" : "cpd"}`;

  const allNavItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: dashboardPath },
    { label: "Client Records", icon: Users, path: "/client-records" },
    { label: "GIS Map", icon: Map, path: "/gis-map" },
    { label: "Inventory", icon: FileText, path: "/inventory", hideForRole: "cpd" },
    { label: "Reports", icon: FileBarChart2, path: "/reports" },
  ];

  const isCpdUser = () => {
    if (savedUserRole === "cpd") return true;
    if (savedUserRole === "health") return false;

    const path = location.pathname.toLowerCase();
    return !path.includes("health") && !path.includes("chc");
  };

  const getOfficeName = () => {
    return isCpdUser() ? "CPD - Office" : "Health - Office";
  };

  const visibleNavItems = allNavItems.filter((item) => {
    if (item.hideForRole === "cpd" && isCpdUser()) {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo-wrapper">
          <img
            src={isCpdUser() ? "/planwise-logo-white.svg" : "/planwise-logo-yellow.svg"}
            alt="PlanWise logo"
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
        {visibleNavItems.map(({ label, icon: Icon, path }) => (
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
          <div className={`user-avatar${isCpdUser() ? " user-avatar--cpd" : ""}`}>
            <span className="user-avatar-text">
              {getOfficeName().charAt(0)}
            </span>
          </div>
          <div className="user-info">
            <span className="user-name">{getOfficeName()}</span>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} className="logout-btn" title="Log out">
            <LogOut size={18} className="nav-icon" />
          </button>
        </div>
      </div>

      {showLogoutConfirm && createPortal(
        <div className="modal-overlay-delete" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-delete" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-delete" onClick={() => setShowLogoutConfirm(false)}>
              <X size={16} />
            </button>

            <div className="archive-icon-circle">
              <LogOut size={26} />
            </div>

            <h2 className="archive-title">Log out?</h2>

            <p className="archive-message">
              You will be signed out of <span className="archive-name">{getOfficeName()}</span> and returned to the login page.
            </p>

            <div className="modal-btn-delete">
              <button className="btn-cancel-d" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="btn-archive" onClick={handleLogout}>
                <LogOut size={15} /> Log out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
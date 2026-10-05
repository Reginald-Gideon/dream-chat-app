import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import "../css/Layout.css";
import Avatar from "../components/Avatar";
const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const AddUserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const GroupIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const SettingsIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 1.72l-.18 1.26a8 8 0 0 0-1.73 1l-1.2-.48a2 2 0 0 0-2.45.9l-.22.38a2 2 0 0 0 .45 2.55l1 .84a8 8 0 0 0 0 2l-1 .84a2 2 0 0 0-.45 2.55l.22.38a2 2 0 0 0 2.45.9l1.2-.48a8 8 0 0 0 1.73 1l.18 1.26A2 2 0 0 0 11.78 22h.44a2 2 0 0 0 2-1.72l.18-1.26a8 8 0 0 0 1.73-1l1.2.48a2 2 0 0 0 2.45-.9l.22-.38a2 2 0 0 0-.45-2.55l-1-.84a8 8 0 0 0 0-2l1-.84a2 2 0 0 0 .45-2.55l-.22-.38a2 2 0 0 0-2.45-.9l-1.2.48a8 8 0 0 0-1.73-1l-.18-1.26A2 2 0 0 0 12.22 2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  const navItems = [
    { to: "/inbox", label: "Messages", icon: <ChatIcon /> },
    { to: "/new", label: "New chat", icon: <AddUserIcon /> },
    { to: "/requests", label: "Requests", icon: <BellIcon /> },
    { to: "/groups", label: "Groups", icon: <GroupIcon /> },
    { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
  ];

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
         <Avatar src={user?.avatar} name={user?.username} className="sidebar-brand-icon" />
          <span className="sidebar-brand-name">Ghostface</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
  
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
         
          <Link to="/profile" className="sidebar-user" style={{ textDecoration: "none" }}>
  {user?.username}
</Link>
          <button onClick={handleLogout} className="sidebar-logout">
            <LogoutIcon />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="app-content">
        <Outlet />
      </div>

      <nav className="mobile-tabbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? "tabbar-link active" : "tabbar-link")}
          >
            {item.icon}
          </NavLink>
        ))}
        <button onClick={handleLogout} className="tabbar-link">
          <LogoutIcon />
        </button>
      </nav>
    </div>
  );
}
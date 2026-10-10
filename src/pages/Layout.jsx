import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import "../css/Layout.css";
import Avatar from "../components/Avatar";
import { getSavedTheme } from "../theme";
const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

// const AddUserIcon = () => (
//   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
//     <circle cx="8.5" cy="7" r="4" />
//     <line x1="20" y1="8" x2="20" y2="14" />
//     <line x1="23" y1="11" x2="17" y2="11" />
//   </svg>
// );

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
const FeedIcon = () => (
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
    <path d="m3 10 9-7 9 7" />
    <path d="M5 9v12h14V9" />
    <path d="M9 21v-7h6v7" />
  </svg>
);
export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const [unreadCounts, setUnreadCounts] = useState({ messages: 0, notifications: 0 });
  const mobilePageTitle = (() => {
    const path = location.pathname;
    if (path === "/feed") return "Feed";
    if (path === "/notifications") return "Notifications";
    if (path === "/settings") return "Settings";
    if (path === "/profile" || path.startsWith("/profile/")) return "Profile";
    if (path === "/create-group") return "Create group";
    if (path === "/groups") return "Groups";
    if (path === "/requests") return "Friend requests";
    if (path === "/inbox") return "Messages";
    if (path === "/new") return "New chat";
    if (path === "/chat") return "Chats";
    return "";
  })();
  const isChatLayout = location.pathname === "/chat"
    || location.pathname.startsWith("/chat/")
    || location.pathname.startsWith("/group/");

  useEffect(() => {
    function syncTheme() {
      document.documentElement.dataset.theme = getSavedTheme();
    }

    syncTheme();
    window.addEventListener("app-theme-change", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("app-theme-change", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const refreshUnreadCounts = useCallback(async () => {
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/unread-counts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const counts = await response.json();
      setUnreadCounts({
        messages: Number(counts.messages) || 0,
        notifications: Number(counts.notifications) || 0,
      });
    } catch {
      // Keep the last known counts when the API is temporarily unavailable.
    }
  }, [token]);

  useEffect(() => {
    refreshUnreadCounts();
    const intervalId = setInterval(refreshUnreadCounts, 20000);
    return () => clearInterval(intervalId);
  }, [location.pathname, refreshUnreadCounts]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  const navItems = [
    { to: "/feed", label: "Feed", icon: <FeedIcon /> },
    { to: "/chat", label: "Messages", icon: <ChatIcon />, unreadKey: "messages" },
    { to: "/notifications", label: "Notifications", icon: <BellIcon />, unreadKey: "notifications" },
    { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
  ];

  const mobileNavItems = [
    navItems[0],
    navItems[1],
    { to: "/profile", label: "Profile", icon: <Avatar src={user?.avatar} name={user?.username} className="tabbar-profile-avatar" /> },
  ];

  function renderBadge(count, className) {
    if (!count) return null;
    return <span className={className}>{count > 99 ? "99+" : count}</span>;
  }

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-name" title="Morphues" aria-label="Morphues">M</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
  
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.unreadKey && renderBadge(unreadCounts[item.unreadKey], "nav-badge")}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link to="/profile" className="sidebar-user">
            <Avatar src={user?.avatar} name={user?.username} className="sidebar-user-avatar" />
            <span>{user?.username || "Profile"}</span>
          </Link>
          <button onClick={handleLogout} className="sidebar-logout" title="Log out" aria-label="Log out">
            <LogoutIcon />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className={`app-content${isChatLayout ? " chat-layout-content" : ""}${mobilePageTitle ? " has-mobile-page-header" : ""}`}>
        {mobilePageTitle && (
          <header className="mobile-app-header">
            <span className="mobile-app-header-brand" aria-hidden="true">M</span>
            <h1>{mobilePageTitle}</h1>
            <Link to="/notifications" className="mobile-app-header-notifications" aria-label="Notifications">
              <BellIcon />
              {renderBadge(unreadCounts.notifications, "mobile-header-badge")}
            </Link>
            <Link to="/profile" className="mobile-app-header-profile" aria-label="Open profile">
              <Avatar src={user?.avatar} name={user?.username} className="mobile-app-header-avatar" />
            </Link>
          </header>
        )}
        <Outlet context={{ refreshUnreadCounts, handleLogout }} />
      </div>

      <nav className="mobile-tabbar">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className={({ isActive }) => (isActive ? "tabbar-link active" : "tabbar-link")}
          >
            {item.icon}
            {item.unreadKey && renderBadge(unreadCounts[item.unreadKey], "tabbar-badge")}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
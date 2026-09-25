import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../css/Layout.css";

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  return (
    <div className="app-layout">
      <nav className="app-nav">
        <div className="app-nav-brand">
          <span className="app-nav-brand-icon">💬</span>
          <span className="app-nav-brand-name">{user?.username}</span>
        </div>
        <NavLink to="/inbox" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Messages
        </NavLink>
        <NavLink to="/new" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          New chat
        </NavLink>
        <button onClick={handleLogout} className="nav-logout">Log out</button>
      </nav>
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Inboxpage.css";

function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    async function fetchGroups() {
      try {
        const response = await fetch("https://dream-chat-app-1.onrender.com/api/groups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load groups.");
        const data = await response.json();
        setGroups(data);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchGroups();
  }, [token]);

  return (
    <div className="inbox-page">
      <h1 className="inbox-title">Groups</h1>

      {error && <p className="inbox-error">{error}</p>}

      {groups.length === 0 && !error && (
        <p className="inbox-empty">No groups yet — create one from "New chat".</p>
      )}

      <ul className="inbox-list">
        {groups.map((g) => (
          <li key={g.id}>
            <button className="inbox-row" onClick={() => navigate(`/group/${g.id}`)}>
              <div className="inbox-avatar">{getInitials(g.name)}</div>
              <div className="inbox-row-content">
                <div className="inbox-row-name">{g.name}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
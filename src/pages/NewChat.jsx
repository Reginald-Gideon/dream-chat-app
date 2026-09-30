import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/NewChat.css";

function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("https://dream-chat-app-1.onrender.com/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load users.");
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      }
    }
    
    fetchUsers();
  }, [token]);

  async function startConversation(otherUserId) {
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otherUserId }),
      });
      if (!response.ok) throw new Error("Failed to start conversation.");
      const conversation = await response.json();
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="newchat-page">
      <h1 className="newchat-title">New chat</h1>
      <p className="newchat-subtitle">Pick someone to start a conversation with.</p>

      <div className="newchat-search">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Search people"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="newchat-error">{error}</p>}

      {filtered.length === 0 && !error && (
        <p className="newchat-empty">
          {search ? "No matching users." : "No other users yet."}
        </p>
      )}

      <ul className="newchat-list">
        {filtered.map((u) => (
          <li key={u.id}>
            <button className="newchat-row" onClick={() => startConversation(u.id)}>
              <div className="newchat-avatar">{getInitials(u.username)}</div>
              <div className="newchat-row-name">{u.username}</div>
              <span className="newchat-row-arrow">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
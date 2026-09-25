import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Inboxpage.css";

function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await fetch("https://dream-chat-app-1.onrender.com/api/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load conversations.");
        const data = await response.json();
        setConversations(data);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchConversations();
  }, [token]);

  const filtered = conversations.filter((c) =>
    c.other_username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="inbox-page">
      <h1 className="inbox-title">Messages</h1>

      <div className="inbox-search">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Search chats"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="inbox-error">{error}</p>}

      {filtered.length === 0 && !error && (
        <p className="inbox-empty">
          {search ? "No matching conversations." : 'No conversations yet — start one from "New chat".'}
        </p>
      )}

      <ul className="inbox-list">
        {filtered.map((c) => (
          <li key={c.conversation_id}>
            <button className="inbox-row" onClick={() => navigate(`/chat/${c.conversation_id}`)}>
              <div className="inbox-avatar">{getInitials(c.other_username)}</div>
              <div className="inbox-row-content">
                <div className="inbox-row-name">{c.other_username}</div>
                <div className="inbox-row-preview">{c.last_message || "No messages yet"}</div>
              </div>
              {c.last_message_at && (
                <div className="inbox-row-time">
                  {new Date(c.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
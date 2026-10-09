import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../css/Inboxpage.css";
import Avatar from "../components/Avatar";


export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const showConversationList = new URLSearchParams(location.search).get("list") === "1";

  // Refresh periodically so new messages become visible while the inbox stays open.
  useEffect(() => {
    async function fetchConversations(openFirstConversation = false) {
      try {
        const response = await fetch("https://dream-chat-app-1.onrender.com/api/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load conversations.");
        const data = await response.json();
        setConversations(data);
        if (openFirstConversation && !showConversationList && data.length > 0) {
          navigate(`/chat/${data[0].conversation_id}`, { replace: true });
        }
      } catch (err) {
        setError(err.message);
      }
    }
    fetchConversations(true);
    const intervalId = window.setInterval(() => fetchConversations(), 15000);
    return () => window.clearInterval(intervalId);
  }, [token, navigate, showConversationList]);

  // track who's online via socket.io
  useEffect(() => {
    const socket = io("https://dream-chat-app-1.onrender.com", {
      auth: { token },
    });

    socket.on("onlineUsers", (userIds) => {
  console.log("Received online users:", userIds);
  setOnlineUserIds(userIds);
});

    socket.on("userOnline", (userId) => {
      setOnlineUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    });

    socket.on("userOffline", (userId) => {
      setOnlineUserIds((prev) => prev.filter((id) => id !== userId));
    });

    socket.on("connect", () => {
  console.log("Socket connected!", socket.id);
});
socket.on("connect_error", (err) => {
  console.log("Socket connection error:", err.message);
});
    return () => socket.disconnect();
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
        {filtered.map((c) => {
          const unreadCount = Number(c.unread_count) || 0;

          return (
          <li key={c.conversation_id}>
            <button
              className={`inbox-row${unreadCount ? " inbox-row-unread" : ""}`}
              onClick={() => navigate(`/chat/${c.conversation_id}`)}
            >
              <Avatar src={c.other_avatar} name={c.other_username} className="inbox-avatar" />
                {onlineUserIds.includes(c.other_user_id) && <span className="online-dot" />}
              
              <div className="inbox-row-content">
                <div className="inbox-row-name">{c.other_username}</div>
                <div className={`inbox-row-preview${c.last_message_unread ? " inbox-row-preview-unread" : ""}`}>
                  {c.last_message || "No messages yet"}
                </div>
              </div>
              {c.last_message_at && (
                <div className="inbox-row-time">
                  {new Date(c.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </div>
              )}
              {unreadCount > 0 && (
                <span className="inbox-unread-count" aria-label={`${unreadCount} unread messages`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
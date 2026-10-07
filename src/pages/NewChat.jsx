import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import "../css/NewChat.css";

export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  async function loadAll() {
    try {
      const [usersRes, friendsRes] = await Promise.all([
        fetch("https://dream-chat-app-1.onrender.com/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("https://dream-chat-app-1.onrender.com/api/friends", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!usersRes.ok || !friendsRes.ok) throw new Error("Failed to load users.");
      const usersData = await usersRes.json();
      const friendsData = await friendsRes.json();
      setUsers(usersData);
      setFriends(friendsData);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function sendRequest(addresseeId) {
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ addresseeId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to send request.");
      }
      setSentRequests((prev) => [...prev, addresseeId]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openConversation(otherUserId) {
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otherUserId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to start conversation.");
      }
      const conversation = await response.json();
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  const friendIds = friends.map((f) => f.id);
  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="newchat-page">
      <h1 className="newchat-title">New chat</h1>
      <p className="newchat-subtitle">Message a friend or start a group.</p>

      <div className="newchat-search">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Search name or username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="newchat-error">{error}</p>}

      {/* Shortcut tiles, like the reference's New group / Invite friends rows */}
      <ul className="newchat-list" style={{ marginBottom: 20 }}>
        <li>
          <Link to="/create-group" className="newchat-row newchat-shortcut">
            <div className="newchat-shortcut-icon group">👥</div>
            <div className="newchat-row-name">New group</div>
            <span className="newchat-row-arrow">→</span>
          </Link>
        </li>
        <li>
          <Link to="/groups" className="newchat-row newchat-shortcut">
            <div className="newchat-shortcut-icon groups-list">📋</div>
            <div className="newchat-row-name">My groups</div>
            <span className="newchat-row-arrow">→</span>
          </Link>
        </li>
      </ul>

      <p className="newchat-section-label">Friends on the app</p>

      {filtered.length === 0 && !error && (
        <p className="newchat-empty">
          {search ? "No matching users." : "No other users yet."}
        </p>
      )}

      <ul className="newchat-list">
        {filtered.map((u) => {
          const isFriend = friendIds.includes(u.id);
          const requestSent = sentRequests.includes(u.id);

          return (
            <li key={u.id}>
              <div className="newchat-row">
                <Avatar src={u.avatar} name={u.username} className="newchat-avatar" />
                <div className="newchat-row-name">{u.username}</div>
                {isFriend ? (
                  <button className="newchat-status friend" onClick={() => openConversation(u.id)}>
                    Message
                  </button>
                ) : requestSent ? (
                  <span className="newchat-status pending">Request sent</span>
                ) : (
                  <button className="newchat-add-button" onClick={() => sendRequest(u.id)}>
                    Add friend
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
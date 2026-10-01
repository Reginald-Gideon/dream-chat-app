import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/NewChat.css";

function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

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
      <h1 className="newchat-title">Add friends</h1>
      <p className="newchat-subtitle">Send a request — once accepted, you can start chatting.</p>

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
        {filtered.map((u) => {
          const isFriend = friendIds.includes(u.id);
          const requestSent = sentRequests.includes(u.id);

          return (
            <li key={u.id}>
              <div className="newchat-row">
                <div className="newchat-avatar">{getInitials(u.username)}</div>
                <div className="newchat-row-name">{u.username}</div>
                {isFriend ? (
                  <button
                    className="newchat-status friend"
                    style={{ border: "none", cursor: "pointer" }}
                    onClick={() => openConversation(u.id)}
                  >
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
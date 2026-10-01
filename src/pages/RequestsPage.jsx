import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "../css/Inboxpage.css";

function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  async function fetchRequests() {
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/friends/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load requests.");
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // live-update when a new request comes in
  useEffect(() => {
    const socket = io("https://dream-chat-app-1.onrender.com", { auth: { token } });
    socket.on("friendRequestReceived", () => {
      fetchRequests();
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function respond(friendshipId, status) {
    try {
      const response = await fetch(
        `https://dream-chat-app-1.onrender.com/api/friends/${friendshipId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );
      if (!response.ok) throw new Error("Failed to respond.");
      setRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="inbox-page">
      <h1 className="inbox-title">Friend requests</h1>

      {error && <p className="inbox-error">{error}</p>}

      {requests.length === 0 && !error && (
        <p className="inbox-empty">No pending requests.</p>
      )}

      <ul className="inbox-list">
        {requests.map((r) => (
          <li key={r.friendship_id}>
            <div className="inbox-row" style={{ cursor: "default" }}>
              <div className="inbox-avatar">{getInitials(r.username)}</div>
              <div className="inbox-row-content">
                <div className="inbox-row-name">{r.username}</div>
                <div className="inbox-row-preview">wants to be friends</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="newchat-add-button"
                  onClick={() => respond(r.friendship_id, "accepted")}
                >
                  Accept
                </button>
                <button
                  className="newchat-status pending"
                  style={{ border: "none", cursor: "pointer" }}
                  onClick={() => respond(r.friendship_id, "declined")}
                >
                  Decline
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
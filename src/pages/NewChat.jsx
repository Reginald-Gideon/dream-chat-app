import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";


export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
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

  return (
    <div style={{ padding: 40, color: "#fff", background: "#0d1321", minHeight: "100vh" }}>
      <h1>Start a conversation</h1>
      {error && <p style={{ color: "#ff8a8a" }}>{error}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {users.map((u) => (
          <li key={u.id} style={{ marginBottom: 10 }}>
            <button
              onClick={() => startConversation(u.id)}
              style={{
                background: "#12182b",
                border: "1px solid #232c47",
                color: "#f4f6fb",
                padding: "10px 16px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {u.username}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
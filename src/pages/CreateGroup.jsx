import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/NewChat.css";

function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

export default function CreateGroup() {
  const [friends, setFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    async function fetchFriends() {
      try {
        const response = await fetch("https://dream-chat-app-1.onrender.com/api/friends", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load friends.");
        const data = await response.json();
        setFriends(data);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchFriends();
  }, [token]);

  function toggleFriend(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!groupName.trim()) {
      setError("Give your group a name.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Pick at least one friend to add.");
      return;
    }

    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: groupName, memberIds: selectedIds }),
      });
      if (!response.ok) throw new Error("Failed to create group.");
      const group = await response.json();
      navigate(`/group/${group.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="newchat-page">
      <h1 className="newchat-title">Create a group</h1>
      <p className="newchat-subtitle">Only your friends can be added.</p>

      <div className="newchat-search">
        <input
          type="text"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
      </div>

      {error && <p className="newchat-error">{error}</p>}

      {friends.length === 0 && !error && (
        <p className="newchat-empty">You need friends before you can start a group.</p>
      )}

      <ul className="newchat-list">
        {friends.map((f) => {
          const isSelected = selectedIds.includes(f.id);
          return (
            <li key={f.id}>
              <button
                className="newchat-row"
                onClick={() => toggleFriend(f.id)}
                style={{
                  borderColor: isSelected ? "var(--blue-primary)" : undefined,
                  background: isSelected ? "var(--blue-pale)" : undefined,
                }}
              >
                <div className="newchat-avatar">{getInitials(f.username)}</div>
                <div className="newchat-row-name">{f.username}</div>
                <span className="newchat-row-arrow">{isSelected ? "✓" : ""}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {friends.length > 0 && (
        <button className="newchat-add-button" style={{ marginTop: 16, padding: "10px 20px" }} onClick={handleCreate}>
          Create group ({selectedIds.length} selected)
        </button>
      )}
    </div>
  );
}
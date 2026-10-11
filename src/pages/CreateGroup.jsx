import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import "../css/CreateGroup.css";

const API_URL = "https://dream-chat-app-1.onrender.com";

export default function CreateGroup() {
  const [friends, setFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Could not load your friends.");
      if (!Array.isArray(data)) throw new Error("The friends list response was invalid.");
      setFriends(data);
    } catch (fetchError) {
      setError(fetchError.message || "Could not load your friends.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  function toggleFriend(id) {
    const normalizedId = String(id);
    setSelectedIds((previous) => (
      previous.includes(normalizedId)
        ? previous.filter((selectedId) => selectedId !== normalizedId)
        : [...previous, normalizedId]
    ));
  }

  async function handleCreate() {
    const name = groupName.trim();
    if (!name) {
      setError("Add a name for your group.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Select at least one friend to add to the group.");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, memberIds: selectedIds }),
      });
      const group = await response.json().catch(() => null);
      if (!response.ok) throw new Error(group?.message || "Could not create the group.");
      if (!group?.id) throw new Error("The group was created, but its chat could not be opened.");
      navigate(`/group/${group.id}`);
    } catch (createError) {
      setError(createError.message || "Could not create the group.");
    } finally {
      setCreating(false);
    }
  }

  const selectedFriends = useMemo(
    () => friends.filter((friend) => selectedIds.includes(String(friend.id))),
    [friends, selectedIds]
  );
  const filteredFriends = useMemo(() => {
    const query = search.trim().toLowerCase();
    return friends.filter((friend) => (friend.username || "").toLowerCase().includes(query));
  }, [friends, search]);

  return (
    <main className="create-group-page">
      <header className="create-group-heading">
        <div>
          <span className="create-group-eyebrow">GROUP CHAT</span>
          <h1>Create a group</h1>
          <p>Give your group a name, then choose the friends you want to bring together.</p>
        </div>
        <Link to="/chat" className="create-group-back">← Back to chats</Link>
      </header>

      <div className="create-group-layout">
        <section className="create-group-form-card" aria-label="Group details">
          <div className="create-group-card-heading">
            <span className="create-group-icon" aria-hidden="true">✦</span>
            <div>
              <h2>Group details</h2>
              <p>Make it easy for friends to recognize.</p>
            </div>
          </div>
          <label className="create-group-name-label" htmlFor="group-name">Group name</label>
          <input
            id="group-name"
            className="create-group-name-input"
            type="text"
            placeholder="e.g. Weekend plans"
            value={groupName}
            maxLength={60}
            onChange={(event) => setGroupName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !creating) handleCreate();
            }}
          />
          <span className="create-group-character-count">{groupName.length}/60</span>

          <div className="create-group-selection-heading">
            <div>
              <h2>Add friends</h2>
              <p>{friends.length} {friends.length === 1 ? "friend" : "friends"} available</p>
            </div>
            <span className="create-group-selected-count">{selectedIds.length} selected</span>
          </div>

          {selectedFriends.length > 0 && (
            <div className="create-group-selected-list" aria-label="Selected friends">
              {selectedFriends.map((friend) => (
                <button
                  type="button"
                  key={friend.id}
                  className="create-group-selected-chip"
                  onClick={() => toggleFriend(friend.id)}
                  aria-label={`Remove ${friend.username} from selection`}
                >
                  <Avatar src={friend.avatar} name={friend.username} className="create-group-chip-avatar" />
                  <span>{friend.username}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}

          <label className="create-group-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></svg>
            <input
              type="search"
              placeholder="Search your friends"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search friends to add"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
          </label>

          {error && <p className="create-group-error" role="alert">{error}</p>}

          {loading ? (
            <div className="create-group-state" role="status"><span className="create-group-spinner" /> Loading friends…</div>
          ) : friends.length === 0 && !error ? (
            <div className="create-group-state">
              <strong>No friends to add yet</strong>
              <span>Add some friends first, then come back to create a group.</span>
              <Link to="/new">Find friends</Link>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="create-group-state">
              <strong>No matching friends</strong>
              <span>Try another name or username.</span>
              <button type="button" onClick={() => setSearch("")}>Clear search</button>
            </div>
          ) : (
            <ul className="create-group-friend-list">
              {filteredFriends.map((friend) => {
                const selected = selectedIds.includes(String(friend.id));
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      className={`create-group-friend${selected ? " selected" : ""}`}
                      onClick={() => toggleFriend(friend.id)}
                      aria-pressed={selected}
                    >
                      <Avatar src={friend.avatar} name={friend.username} className="create-group-friend-avatar" />
                      <span className="create-group-friend-copy">
                        <strong>{friend.username}</strong>
                        <small>{selected ? "Added to this group" : "Friend"}</small>
                      </span>
                      <span className="create-group-check" aria-hidden="true">{selected ? "✓" : "+"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            className="create-group-submit"
            onClick={handleCreate}
            disabled={loading || creating || !groupName.trim() || selectedIds.length === 0}
          >
            {creating ? "Creating group…" : `Create group${selectedIds.length ? ` · ${selectedIds.length}` : ""}`}
          </button>
        </section>

        <aside className="create-group-preview" aria-label="Group preview">
          <div className="create-group-preview-art" aria-hidden="true">
            <span>✦</span><span>✧</span><span>✦</span>
            <div className="create-group-preview-avatar">👥</div>
          </div>
          <span className="create-group-preview-label">YOUR NEW GROUP</span>
          <h2>{groupName.trim() || "Group name"}</h2>
          <p>{selectedIds.length + 1} {selectedIds.length + 1 === 1 ? "member" : "members"} including you</p>
          {selectedFriends.length > 0 && (
            <div className="create-group-preview-members">
              {selectedFriends.slice(0, 5).map((friend) => (
                <Avatar
                  key={friend.id}
                  src={friend.avatar}
                  name={friend.username}
                  className="create-group-preview-avatar-member"
                />
              ))}
              {selectedFriends.length > 5 && <span>+{selectedFriends.length - 5}</span>}
            </div>
          )}
          <div className="create-group-preview-note">
            <span aria-hidden="true">🔒</span>
            <span>Only friends you select will be added to this conversation.</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import "../css/NewChat.css";

export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  async function loadAll() {
    setLoading(true);
    setError("");
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function sendRequest(addresseeId) {
    setBusyUserId(addresseeId);
    setError("");
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
      setSentRequests((prev) => [...new Set([...prev, String(addresseeId)])]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function openConversation(otherUserId) {
    setBusyUserId(otherUserId);
    setError("");
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
    } finally {
      setBusyUserId(null);
    }
  }

  const friendIds = new Set(friends.map((friend) => String(friend.id)));
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = users.filter((user) => {
    const matchesSearch = (user.username || "").toLowerCase().includes(normalizedSearch);
    const isFriend = friendIds.has(String(user.id));
    return matchesSearch && (activeTab === "all" || (activeTab === "friends" ? isFriend : !isFriend));
  });

  return (
    <div className="newchat-page">
      <header className="newchat-heading">
        <div className="newchat-heading-copy">
          <span className="newchat-eyebrow">MESSAGES</span>
          <h1 className="newchat-title">Start a conversation</h1>
          <p className="newchat-subtitle">Find a friend to message or bring everyone together in a group.</p>
        </div>
        <Link to="/chat" className="newchat-back-link">← Back to chats</Link>
      </header>

      <section className="newchat-discovery" aria-label="Find people to chat with">
      <label className="newchat-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></svg>
        <input
          type="search"
          placeholder="Search name or username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search people"
        />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
      </label>

      <div className="newchat-tabs" role="tablist" aria-label="People">
        <button type="button" role="tab" aria-selected={activeTab === "all"} className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")}>
          Everyone <span>{users.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "friends"} className={activeTab === "friends" ? "active" : ""} onClick={() => setActiveTab("friends")}>
          Friends <span>{friends.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "discover"} className={activeTab === "discover" ? "active" : ""} onClick={() => setActiveTab("discover")}>
          Discover <span>{Math.max(0, users.length - friends.length)}</span>
        </button>
      </div>

      {error && <div className="newchat-error" role="alert"><span>{error}</span><button type="button" onClick={loadAll}>Try again</button></div>}

      <div className="newchat-results-heading">
        <div>
          <h2>{activeTab === "friends" ? "Your friends" : activeTab === "discover" ? "People to meet" : "People"}</h2>
          <p>{activeTab === "friends" ? "Pick a friend and get back in touch." : "Choose someone to message or send a friend request."}</p>
        </div>
        <span>{loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "person" : "people"}`}</span>
      </div>

      {loading ? (
        <div className="newchat-loading" role="status"><span className="newchat-spinner" /> Loading people…</div>
      ) : filtered.length === 0 ? (
        <div className="newchat-empty">
          <span className="newchat-empty-icon" aria-hidden="true">{search ? "⌕" : activeTab === "friends" ? "♡" : "✦"}</span>
          <strong>{search ? "No matches found" : activeTab === "friends" ? "No friends yet" : "No one to show yet"}</strong>
          <span>{search ? "Try a different name or username." : activeTab === "friends" ? "Add people from Discover to start chatting." : "Check back later to find people to chat with."}</span>
          {search && <button type="button" onClick={() => setSearch("")}>Clear search</button>}
        </div>
      ) : (
        <ul className="newchat-list">
          {filtered.map((u) => {
            const isFriend = friendIds.has(String(u.id));
            const requestSent = sentRequests.includes(String(u.id));
            const busy = String(busyUserId) === String(u.id);

            return (
              <li key={u.id} className="newchat-person">
                <Avatar src={u.avatar} name={u.username} className="newchat-avatar" />
                <div className="newchat-person-copy">
                  <strong>{u.username}</strong>
                  <span>{isFriend ? "Friend" : requestSent ? "Friend request sent" : "Not connected yet"}</span>
                </div>
                {isFriend ? (
                  <button className="newchat-action message" onClick={() => openConversation(u.id)} disabled={busy}>
                    {busy ? "Opening…" : "Message"}
                  </button>
                ) : requestSent ? (
                  <button type="button" className="newchat-action sent" disabled>
                    <span aria-hidden="true">✓</span> Request sent
                  </button>
                ) : (
                  <button className="newchat-action add" onClick={() => sendRequest(u.id)} disabled={busy}>
                    {busy ? "Sending…" : "Add friend"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      </section>

      <section className="newchat-group-shortcuts" aria-label="Group chats">
        <div className="newchat-group-copy">
          <span className="newchat-shortcut-icon group" aria-hidden="true">✦</span>
          <span><strong>Want to chat with everyone?</strong><small>Create a group or open one you already belong to.</small></span>
        </div>
        <div className="newchat-group-actions">
          <Link to="/create-group">Create group</Link>
          <Link to="/groups">My groups <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </div>
  );
}
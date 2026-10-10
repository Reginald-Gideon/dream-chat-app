import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { resizeImage } from "../resizeImage";
import Avatar from "../components/Avatar";
import "../css/Profile.css";

const API_URL = "https://dream-chat-app-1.onrender.com";

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ProfilePage() {
  const { handleLogout } = useOutletContext();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [posts, setPosts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [friendCount, setFriendCount] = useState(0);
  const [activeTab, setActiveTab] = useState("posts");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("token");

  const fetchProfileContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [postsResponse, statusesResponse, friendsResponse] = await Promise.all([
        fetch(`${API_URL}/api/posts`, { headers }),
        fetch(`${API_URL}/api/statuses`, { headers }),
        fetch(`${API_URL}/api/friends`, { headers }),
      ]);
      if (!postsResponse.ok || !statusesResponse.ok || !friendsResponse.ok) {
        throw new Error("Could not load your profile. Please try again.");
      }
      const [allPosts, allStatuses, friends] = await Promise.all([
        postsResponse.json(),
        statusesResponse.json(),
        friendsResponse.json(),
      ]);
      setPosts(allPosts.filter((post) => Number(post.user_id) === Number(user?.id)));
      setStatuses(allStatuses.filter((status) => Number(status.user_id) === Number(user?.id)));
      setFriendCount(friends.length);
    } catch (loadError) {
      setError(loadError.message || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchProfileContent();
  }, [fetchProfileContent]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const resized = await resizeImage(file, 256);
      const response = await fetch(`${API_URL}/api/users/avatar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: resized }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to update profile photo.");

      const updatedUser = { ...user, avatar: resized };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (uploadError) {
      setError(uploadError.message || "Failed to update profile photo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function deletePost(postId) {
    if (!window.confirm("Delete this post? This action cannot be undone.")) return;
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to delete post.");
      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete post.");
    }
  }

  async function deleteStatus(statusId) {
    if (!window.confirm("Delete this status? This action cannot be undone.")) return;
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/statuses/${statusId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to delete status.");
      setStatuses((current) => current.filter((status) => status.id !== statusId));
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete status.");
    }
  }

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <section className="profile-card" aria-label="Your profile">
          <div className="profile-identity">
            <div className="profile-avatar-wrap">
              <Avatar src={user?.avatar} name={user?.username} className="profile-avatar" />
              <button
                type="button"
                className="profile-avatar-edit"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label={uploading ? "Uploading profile photo" : "Change profile photo"}
                title={uploading ? "Uploading..." : "Change profile photo"}
              >
                {uploading ? "…" : "+"}
              </button>
              <input
                ref={fileInputRef}
                className="profile-photo-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                tabIndex={-1}
              />
            </div>
            <div className="profile-identity-copy">
              <h1>{user?.username || "Your profile"}</h1>
              <p>{user?.email}</p>
              <span>Welcome to your Morphues profile.</span>
            </div>
            <button
              type="button"
              className="profile-edit-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Updating..." : "Edit photo"}
            </button>
          </div>

          <div className="profile-stats" aria-label="Profile statistics">
            <div><strong>{posts.length}</strong><span>Posts</span></div>
            <div><strong>{friendCount}</strong><span>Friends</span></div>
            <div><strong>{statuses.length}</strong><span>Active status</span></div>
          </div>

          <div className="profile-highlights">
            <div className="profile-highlights-heading">
              <h2>Recent status</h2>
              <span>Expires after 24 hours</span>
            </div>
            <div className="profile-highlight-list">
              {statuses.length === 0 ? (
                <div className="profile-highlight-empty">
                  <span className="profile-highlight-add" aria-hidden="true">+</span>
                  <span>No active status</span>
                </div>
              ) : statuses.slice(0, 6).map((status) => (
                <div className="profile-highlight" key={status.id}>
                  <div className="profile-highlight-ring">
                    <div
                      className="profile-highlight-content"
                      style={{ background: status.image_url ? `center / cover url("${status.image_url}")` : status.background_color }}
                    >
                      {!status.image_url && (status.content || "Status")}
                    </div>
                  </div>
                  <span>{formatDate(status.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="profile-mobile-actions" aria-label="Profile and account options">
          <Link to="/settings">
            <span className="profile-mobile-action-icon" aria-hidden="true">⚙</span>
            <span><strong>Settings</strong><small>Appearance and account preferences</small></span>
            <span className="profile-mobile-action-arrow" aria-hidden="true">›</span>
          </Link>
          <button type="button" onClick={handleLogout}>
            <span className="profile-mobile-action-icon logout" aria-hidden="true">↪</span>
            <span><strong>Log out</strong><small>Sign out of your account</small></span>
            <span className="profile-mobile-action-arrow" aria-hidden="true">›</span>
          </button>
        </section>

        {error && <p className="profile-error" role="alert">{error}</p>}

        <section className="profile-content">
          <div className="profile-tabs" role="tablist" aria-label="Profile content">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "posts"}
              className={activeTab === "posts" ? "active" : ""}
              onClick={() => setActiveTab("posts")}
            >
              <span aria-hidden="true">▦</span> Posts <span className="profile-tab-count">{posts.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "statuses"}
              className={activeTab === "statuses" ? "active" : ""}
              onClick={() => setActiveTab("statuses")}
            >
              <span aria-hidden="true">◉</span> Status <span className="profile-tab-count">{statuses.length}</span>
            </button>
          </div>

          {loading ? (
            <p className="profile-empty">Loading your profile…</p>
          ) : activeTab === "posts" ? (
            posts.length > 0 ? (
              <div className="profile-post-grid">
                {posts.map((post) => (
                  <article className="profile-post-tile" key={post.id}>
                    {post.image_url ? (
                      <img src={post.image_url} alt={post.caption || "Your post"} />
                    ) : (
                      <div className="profile-post-text-tile">{post.caption || "Post"}</div>
                    )}
                    <div className="profile-post-overlay">
                      <span>{post.caption || "Your post"}</span>
                      <button type="button" onClick={() => deletePost(post.id)} aria-label="Delete post">
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="profile-empty">Your posts will appear here.</p>
            )
          ) : (
            statuses.length > 0 ? (
              <div className="profile-status-grid">
                {statuses.map((status) => (
                  <article
                    className="profile-status-tile"
                    key={status.id}
                    style={{ background: status.image_url ? `center / cover url("${status.image_url}")` : status.background_color }}
                  >
                    <p>{status.content || "Photo status"}</p>
                    <time>{formatDate(status.created_at)}</time>
                    <button type="button" onClick={() => deleteStatus(status.id)} aria-label="Delete status">
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="profile-empty">Your active statuses will appear here.</p>
            )
          )}
        </section>
      </div>
    </main>
  );
}

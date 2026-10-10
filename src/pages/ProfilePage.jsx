import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { resizeImage } from "../resizeImage";
import Avatar from "../components/Avatar";
import "../css/Profile.css";

const API_URL = "https://dream-chat-app-1.onrender.com";

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ProfilePage() {
  const { handleLogout } = useOutletContext();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [friendCount, setFriendCount] = useState(0);
  const [friends, setFriends] = useState([]);
  const [friendsAvailable, setFriendsAvailable] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("token");
  const viewedUserId = userId || currentUser?.id;
  const isOwnProfile = Number(viewedUserId) === Number(currentUser?.id);

  const fetchProfileContent = useCallback(async () => {
    setLoading(true);
    setError("");
    setProfileUser(isOwnProfile ? currentUser : null);
    setPosts([]);
    setStatuses([]);
    setFriendCount(0);
    setFriends([]);
    setFriendsAvailable(true);
    setIsFriend(false);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (!isOwnProfile) {
        const response = await fetch(`${API_URL}/api/users/${viewedUserId}/profile`, { headers });
        if (response.status === 404) {
          // Support deployments where the profile endpoint has not been deployed yet.
          const [usersResponse, postsResponse, statusesResponse] = await Promise.all([
            fetch(`${API_URL}/api/users`, { headers }),
            fetch(`${API_URL}/api/posts`, { headers }),
            fetch(`${API_URL}/api/statuses`, { headers }),
          ]);
          if (!usersResponse.ok || !postsResponse.ok || !statusesResponse.ok) {
            throw new Error("Could not load this profile.");
          }
          const [users, allPosts, allStatuses] = await Promise.all([
            usersResponse.json(),
            postsResponse.json(),
            statusesResponse.json(),
          ]);
          const selectedUser = users.find((item) => Number(item.id) === Number(viewedUserId));
          if (!selectedUser) throw new Error("This profile is unavailable.");
          const [selectedFriendsResponse, ownFriendsResponse] = await Promise.all([
            fetch(`${API_URL}/api/users/${viewedUserId}/friends`, { headers }),
            fetch(`${API_URL}/api/friends`, { headers }),
          ]);
          if (selectedFriendsResponse.ok) {
            const selectedFriends = await selectedFriendsResponse.json();
            setFriends(selectedFriends);
            setFriendCount(selectedFriends.length);
          } else {
            setFriendsAvailable(false);
          }
          if (ownFriendsResponse.ok) {
            const ownFriends = await ownFriendsResponse.json();
            setIsFriend(ownFriends.some((friend) => Number(friend.id) === Number(viewedUserId)));
          }
          setProfileUser(selectedUser);
          setPosts(allPosts.filter((post) => Number(post.user_id) === Number(viewedUserId)));
          setStatuses(allStatuses.filter((status) => Number(status.user_id) === Number(viewedUserId)));
          return;
        }
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || "Could not load this profile.");
        if (!data?.user || !Array.isArray(data.posts) || !Array.isArray(data.statuses)) {
          throw new Error("The selected user's profile could not be loaded.");
        }
        setProfileUser(data.user);
        setPosts(data.posts);
        setStatuses(data.statuses);
        setFriends(Array.isArray(data.friends) ? data.friends : []);
        setFriendsAvailable(Array.isArray(data.friends));
        setFriendCount(Array.isArray(data.friends) ? data.friends.length : Number(data.friendCount) || 0);
        setIsFriend(true);
        return;
      }

      setProfileUser(currentUser);
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
      setPosts(allPosts.filter((post) => Number(post.user_id) === Number(currentUser?.id)));
      setStatuses(allStatuses.filter((status) => Number(status.user_id) === Number(currentUser?.id)));
      setFriendCount(friends.length);
      setFriends(friends);
      setIsFriend(false);
    } catch (loadError) {
      setError(loadError.message || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, [currentUser, isOwnProfile, token, viewedUserId]);

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

      const updatedUser = { ...currentUser, avatar: resized };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setProfileUser(updatedUser);
    } catch (uploadError) {
      setError(uploadError.message || "Failed to update profile photo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function deletePost(postId) {
    if (!isOwnProfile) return;
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
    if (!isOwnProfile) return;
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

  async function messageFriend(friend) {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otherUserId: friend.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not open this conversation.");
      navigate(`/chat/${data.id}`);
    } catch (messageError) {
      setError(messageError.message || "Could not open this conversation.");
    }
  }

  async function removeFriend(friend) {
    if (!window.confirm(`Remove ${friend.username} from your friends?`)) return;
    setError("");
    setRemovingFriendId(friend.id);
    try {
      const response = await fetch(`${API_URL}/api/friends/${friend.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not remove this friend.");
      setFriends((current) => current.filter((item) => Number(item.id) !== Number(friend.id)));
      setFriendCount((count) => Math.max(0, count - 1));
    } catch (removeError) {
      setError(removeError.message || "Could not remove this friend.");
    } finally {
      setRemovingFriendId(null);
    }
  }

  async function removeProfileFriend() {
    if (!profileUser || isOwnProfile) return;
    if (!window.confirm(`Remove ${profileUser.username} from your friends?`)) return;
    setError("");
    setRemovingFriendId(profileUser.id);
    try {
      const response = await fetch(`${API_URL}/api/friends/${profileUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not remove this friend.");
      setIsFriend(false);
      setFriends((current) => current.filter((friend) => Number(friend.id) !== Number(currentUser?.id)));
      setFriendCount((count) => Math.max(0, Number(count) - 1));
    } catch (removeError) {
      setError(removeError.message || "Could not remove this friend.");
    } finally {
      setRemovingFriendId(null);
    }
  }

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <section className="profile-card" aria-label={isOwnProfile ? "Your profile" : `${profileUser?.username || "User"}'s profile`}>
          <div className="profile-identity">
            <div className={`profile-avatar-wrap${statuses.length ? " has-active-status" : ""}`}>
              <Avatar src={profileUser?.avatar} name={profileUser?.username} className="profile-avatar" />
              {isOwnProfile && (
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
              )}
              <input
                ref={fileInputRef}
                className="profile-photo-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={!isOwnProfile || uploading}
                tabIndex={-1}
              />
            </div>
            <div className="profile-identity-copy">
              <h1>{profileUser?.username || (loading ? "Loading profile…" : "Profile")}</h1>
              <p>{isOwnProfile ? profileUser?.email : `@${profileUser?.username || ""}`}</p>
              <span>{isOwnProfile ? "Welcome to your Morphues profile." : "Profile and recent posts"}</span>
            </div>
            {isOwnProfile ? <button
              type="button"
              className="profile-edit-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Updating..." : "Edit photo"}
            </button> : isFriend && (
              <div className="profile-visitor-actions">
                <button
                  type="button"
                  className="profile-message-friend-button"
                  onClick={() => messageFriend(profileUser)}
                >
                  Message
                </button>
                <button
                  type="button"
                  className="profile-remove-friend-button"
                  onClick={removeProfileFriend}
                  disabled={removingFriendId === profileUser?.id}
                >
                  {removingFriendId === profileUser?.id ? "Removing…" : "Remove friend"}
                </button>
              </div>
            )}
          </div>

          <div className="profile-stats" aria-label="Profile statistics">
            <div><strong>{posts.length}</strong><span>Posts</span></div>
            <button
              type="button"
              className="profile-friends-stat"
              onClick={() => friendsAvailable && setFriendsOpen(true)}
              disabled={!friendsAvailable}
              aria-label={`${friendCount ?? "Unknown"} friends${friendsAvailable ? ", open friends list" : ""}`}
            >
              <strong>{friendCount ?? "—"}</strong><span>Friends</span>
            </button>
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

        {isOwnProfile && <section className="profile-mobile-actions" aria-label="Profile and account options">
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
        </section>}

        {error && <p className="profile-error" role="alert">{error}</p>}

        {friendsOpen && (
          <div className="profile-friends-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFriendsOpen(false);
          }}>
            <section
              className="profile-friends-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-friends-title"
            >
              <header>
                <div>
                  <h2 id="profile-friends-title">{isOwnProfile ? "Your friends" : `${profileUser?.username || "Their"}'s friends`}</h2>
                  <span>{friends.length} {friends.length === 1 ? "friend" : "friends"}</span>
                </div>
                <button type="button" onClick={() => setFriendsOpen(false)} aria-label="Close friends list">×</button>
              </header>
              {friends.length === 0 ? (
                <p className="profile-friends-empty">You haven't added any friends yet.</p>
              ) : (
                <ul className="profile-friends-list">
                  {friends.map((friend) => (
                    <li key={friend.id}>
                      <Avatar src={friend.avatar} name={friend.username} className="profile-friend-avatar" />
                      <strong>{friend.username}</strong>
                      <div className="profile-friend-actions">
                        {isOwnProfile && (
                          <>
                            <button type="button" onClick={() => messageFriend(friend)}>Message</button>
                            <button
                              type="button"
                              className="remove"
                              disabled={removingFriendId === friend.id}
                              onClick={() => removeFriend(friend)}
                            >
                              {removingFriendId === friend.id ? "Removing…" : "Remove"}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

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
                      {isOwnProfile && (
                        <button type="button" onClick={() => deletePost(post.id)} aria-label="Delete post">
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
            <p className="profile-empty">
              {isOwnProfile ? "Your posts will appear here." : `${profileUser?.username || "This user"} has no posts yet.`}
            </p>
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
                    {isOwnProfile && (
                      <button type="button" onClick={() => deleteStatus(status.id)} aria-label="Delete status">
                        Delete
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="profile-empty">
                {isOwnProfile ? "Your active statuses will appear here." : `${profileUser?.username || "This user"} has no active statuses.`}
              </p>
            )
          )}
        </section>
      </div>
    </main>
  );
}

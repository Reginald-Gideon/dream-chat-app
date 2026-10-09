import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { resizeImage } from "../resizeImage";
import "../css/Feed.css";
import StatusBar from "./Statusbar.jsx";
function Icon({ name, size = 24, filled = false }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "heart") return <svg {...common}><path d="M20.8 8.7c0 4.3-8.8 10-8.8 10s-8.8-5.7-8.8-10A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" fill={filled ? "currentColor" : "none"} /></svg>;
  if (name === "comment") return <svg {...common}><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></svg>;
  if (name === "image") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>;
  if (name === "smile") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>;
  return null;
}

function timeAgo(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ src, name, className }) {
  if (src) return <img className={className} src={src} alt={name} style={{ objectFit: "cover" }} />;
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 13 }}>
      {name ? name.slice(0, 2).toUpperCase() : "?"}
    </div>
  );
}

export default function Feed() {
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const [error, setError] = useState("");
  const [expandedComments, setExpandedComments] = useState({}); // { postId: [comments] }
  const [commentDraft, setCommentDraft] = useState({}); // { postId: text }

  const [composerOpen, setComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  const [friends, setFriends] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  async function fetchPosts() {
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load feed.");
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchFriends() {
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) setFriends(await response.json());
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    fetchPosts();
    fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const match = location.hash.match(/^#post-(.+)$/);
    if (!match || posts.length === 0) return;

    const postId = match[1];
    const postElement = document.getElementById(`feed-post-${postId}`);
    if (!postElement) return;

    setHighlightedPostId(postId);
    postElement.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeoutId = window.setTimeout(() => setHighlightedPostId(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [location.hash, posts.length]);

  async function toggleLike(postId) {
    // optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked_by_me: !p.liked_by_me,
              like_count: Number(p.like_count) + (p.liked_by_me ? -1 : 1),
            }
          : p
      )
    );
    try {
      await fetch(`https://dream-chat-app-1.onrender.com/api/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      fetchPosts(); // revert by re-syncing if the request failed
    }
  }

  async function loadComments(postId) {
    if (expandedComments[postId]) {
      // already loaded — just toggle closed
      setExpandedComments((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return;
    }
    try {
      const response = await fetch(`https://dream-chat-app-1.onrender.com/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setExpandedComments((prev) => ({ ...prev, [postId]: data }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitComment(e, postId) {
    e.preventDefault();
    const text = (commentDraft[postId] || "").trim();
    if (!text) return;

    try {
      const response = await fetch(`https://dream-chat-app-1.onrender.com/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text }),
      });
      if (!response.ok) throw new Error("Failed to post comment.");
      const newComment = await response.json();

      setExpandedComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comment_count: Number(p.comment_count) + 1 } : p))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImagePick(e) {
    const file = e.target.files[0];
    if (!file) return;
    const resized = await resizeImage(file, 600);
    setImagePreview(resized);
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    if (!caption.trim() && !imagePreview) return;

    setPosting(true);
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ caption, imageUrl: imagePreview }),
      });
      if (!response.ok) throw new Error("Failed to create post.");
      setCaption("");
      setImagePreview(null);
      setComposerOpen(false);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="feed-page">
      <div className="feed-layout">
        <section className="feed-main" aria-label="Feed">
          {/* --- New post composer --- */}
          <section className="stories-panel">
            {!composerOpen ? (
              <button
                className="icon-button"
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", justifyContent: "flex-start" }}
                onClick={() => setComposerOpen(true)}
              >
                <Avatar src={user?.avatar} name={user?.username} className="post-avatar" />
                <span style={{ color: "var(--feed-muted)", fontSize: 13 }}>Share something...</span>
              </button>
            ) : (
              <form onSubmit={handleCreatePost}>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={3}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "1px solid var(--feed-line)",
                    borderRadius: 8,
                    color: "var(--feed-ink)",
                    padding: 10,
                    fontFamily: "inherit",
                    fontSize: 13,
                    resize: "vertical",
                  }}
                />
                {imagePreview && (
                  <img src={imagePreview} alt="" style={{ width: "100%", borderRadius: 8, marginTop: 8 }} />
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="icon-button" onClick={() => fileInputRef.current?.click()}>
                      <Icon name="image" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImagePick}
                      style={{ display: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="follow-label"
                      onClick={() => {
                        setComposerOpen(false);
                        setCaption("");
                        setImagePreview(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="follow-label" disabled={posting}>
                      {posting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>

          {error && <p style={{ color: "#ff5b74", fontSize: 13, margin: "12px 0" }}>{error}</p>}

          {/* --- Posts --- */}
          <div className="post-list">
            {posts.length === 0 && !error && (
              <p style={{ color: "var(--feed-muted)", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
                No posts yet. Be the first to share something.
              </p>
            )}

            {posts.map((post) => {
              const comments = expandedComments[post.id];

              return (
                <article
                  className={`feed-post${String(highlightedPostId) === String(post.id) ? " feed-post-highlighted" : ""}`}
                  id={`feed-post-${post.id}`}
                  key={post.id}
                >
                  <header className="post-header">
                    <div className="post-author">
                      <Avatar src={post.avatar} name={post.username} className="post-avatar" />
                      <div className="post-author-copy">
                        <strong>{post.username}</strong>
                        <span>{timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  </header>

                  {post.image_url && <img className="post-image" src={post.image_url} alt="" />}

                  <div className="post-details">
                    <div className="post-actions">
                      <div className="post-actions-left">
                        <button
                          className={`icon-button like-button${post.liked_by_me ? " liked" : ""}`}
                          onClick={() => toggleLike(post.id)}
                        >
                          <Icon name="heart" filled={post.liked_by_me} />
                        </button>
                        <button className="icon-button" onClick={() => loadComments(post.id)}>
                          <Icon name="comment" />
                        </button>
                      </div>
                    </div>

                    <strong className="post-likes">{Number(post.like_count)} likes</strong>
                    {post.caption && (
                      <p className="post-caption">
                        <strong>{post.username}</strong> {post.caption}
                      </p>
                    )}

                    <button
                      className="post-comments"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                      onClick={() => loadComments(post.id)}
                    >
                      {comments ? "Hide comments" : `View all ${Number(post.comment_count)} comments`}
                    </button>

                    {comments &&
                      comments.map((c) => (
                        <p className="posted-comment" key={c.id}>
                          <strong>{c.username}</strong> {c.content}
                        </p>
                      ))}

                    <span className="post-time">{timeAgo(post.created_at)}</span>

                    <form className="comment-entry" onSubmit={(e) => submitComment(e, post.id)}>
                      <Avatar src={user?.avatar} name={user?.username} className="post-avatar" />
                      <input
                        type="text"
                        value={commentDraft[post.id] || ""}
                        onChange={(e) =>
                          setCommentDraft((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        placeholder="Add a comment..."
                      />
                      {(commentDraft[post.id] || "").trim() && (
                        <button className="comment-submit" type="submit">Post</button>
                      )}
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="feed-rail" aria-label="Your account">
              <div className="current-account">
            <Avatar src={user?.avatar} name={user?.username} className="post-avatar" style={{ width: 43, height: 43 }} />
            <div className="account-copy">
              <strong>@{user?.username}</strong>
              <span>{user?.email}</span>
            </div>
          </div>

          <section className="stories-panel feed-stories" aria-label="Stories">
            <StatusBar />
          </section>

        
          <section className="suggestions-panel">
            <div className="suggestions-heading">
              <h2>Your friends</h2>
            </div>
            <div className="suggestion-list">
              {friends.length === 0 && (
                <p style={{ color: "var(--feed-muted)", fontSize: 12 }}>No friends yet.</p>
              )}
              {friends.map((f) => (
                <div className="suggestion-row" key={f.id}>
                  <Avatar src={f.avatar} name={f.username} className="post-avatar" style={{ width: 36, height: 36 }} />
                  <div className="suggestion-copy">
                    <strong>{f.username}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
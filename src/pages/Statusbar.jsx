import { useState, useEffect, useRef, useCallback } from "react";
import { resizeImage } from "../resizeImage";
import "../css/StatusBar.css";

const COLORS = ["#4C3BCF", "#0F766E", "#B91C63", "#1D4ED8", "#171717"];

function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

export default function StatusBar() {
  const [statuses, setStatuses] = useState([]);
  const [viewerGroup, setViewerGroup] = useState(null); // array of that user's statuses being viewed
  const [viewerIndex, setViewerIndex] = useState(0);

  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [imagePreview, setImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/statuses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) setStatuses(await response.json());
    } catch {
      // non-critical
    }
  }, [token]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // group flat status list by user, most recent first within each group
  const grouped = statuses.reduce((acc, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = { user_id: s.user_id, username: s.username, avatar: s.avatar, items: [] };
    acc[s.user_id].items.push(s);
    return acc;
  }, {});
  const groups = Object.values(grouped);

  async function openGroup(group) {
    setViewerGroup(group.items);
    setViewerIndex(0);
    markViewed(group.items[0].id);
  }

  async function markViewed(statusId) {
    try {
      await fetch(`https://dream-chat-app-1.onrender.com/api/statuses/${statusId}/view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatuses((prev) => prev.map((s) => (s.id === statusId ? { ...s, viewed_by_me: true } : s)));
    } catch {
      // non-critical
    }
  }

  function nextStory() {
    if (viewerIndex + 1 < viewerGroup.length) {
      const next = viewerIndex + 1;
      setViewerIndex(next);
      markViewed(viewerGroup[next].id);
    } else {
      setViewerGroup(null);
    }
  }

  function prevStory() {
    if (viewerIndex > 0) setViewerIndex(viewerIndex - 1);
  }

  async function handleImagePick(e) {
    const file = e.target.files[0];
    if (!file) return;
    const resized = await resizeImage(file, 500);
    setImagePreview(resized);
  }

  async function handlePost() {
    if (!text.trim() && !imagePreview) return;
    setPosting(true);
    try {
      await fetch("https://dream-chat-app-1.onrender.com/api/statuses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text, imageUrl: imagePreview, backgroundColor: color }),
      });
      setText("");
      setImagePreview(null);
      setComposerOpen(false);
      fetchStatuses();
    } catch {
      // non-critical
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      <div className="status-bar">
        <div className="status-item" onClick={() => setComposerOpen(true)}>
          <div className="status-ring status-ring-self">
            {user?.avatar ? (
              <img src={user.avatar} alt="" />
            ) : (
              <div className="status-avatar-fallback">{getInitials(user?.username)}</div>
            )}
            <span className="status-add">+</span>
          </div>
          <span className="status-name">Your status</span>
        </div>

        {groups.map((g) => {
          const allViewed = g.items.every((s) => s.viewed_by_me);
          return (
            <div className="status-item" key={g.user_id} onClick={() => openGroup(g)}>
              <div className={`status-ring${allViewed ? "" : " status-ring-fresh"}`}>
                {g.avatar ? (
                  <img src={g.avatar} alt="" />
                ) : (
                  <div className="status-avatar-fallback">{getInitials(g.username)}</div>
                )}
              </div>
              <span className="status-name">{g.username}</span>
            </div>
          );
        })}
      </div>

      {/* --- Full-screen story viewer --- */}
      {viewerGroup && (
        <div className="status-viewer" onClick={() => setViewerGroup(null)}>
          <div className="status-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="status-viewer-bars">
              {viewerGroup.map((_, i) => (
                <div key={i} className={`status-bar-segment ${i <= viewerIndex ? "filled" : ""}`} />
              ))}
            </div>

            <div
              className="status-viewer-slide"
              style={{ background: viewerGroup[viewerIndex].image_url ? "#000" : viewerGroup[viewerIndex].background_color }}
            >
              {viewerGroup[viewerIndex].image_url && (
                <img src={viewerGroup[viewerIndex].image_url} alt="" className="status-viewer-image" />
              )}
              {viewerGroup[viewerIndex].content && (
                <p className="status-viewer-text">{viewerGroup[viewerIndex].content}</p>
              )}
            </div>

            <button className="status-nav left" onClick={prevStory}>‹</button>
            <button className="status-nav right" onClick={nextStory}>›</button>
            <button className="status-close" onClick={() => setViewerGroup(null)}>✕</button>
          </div>
        </div>
      )}

      {/* --- Composer --- */}
      {composerOpen && (
        <div className="status-viewer" onClick={() => setComposerOpen(false)}>
          <div className="status-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div
              className="status-viewer-slide"
              style={{ background: imagePreview ? "#000" : color }}
            >
              {imagePreview && <img src={imagePreview} alt="" className="status-viewer-image" />}
              <textarea
                className="status-composer-input"
                placeholder="Type a status..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div className="status-composer-controls">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`status-color-dot ${c === color ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <button className="status-color-dot image-pick" onClick={() => fileInputRef.current?.click()}>
                🖼
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} style={{ display: "none" }} />
            </div>

            <button className="status-close" onClick={() => setComposerOpen(false)}>✕</button>
            <button className="status-send" onClick={handlePost} disabled={posting}>
              {posting ? "..." : "➤"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Avatar from "../components/Avatar";
import "../css/Notifications.css";

function describeNotification(type) {
  if (type === "friend_request") return "sent you a friend request.";
  if (type === "like") return "liked your post.";
  if (type === "comment") return "commented on your post.";
  return "interacted with you.";
}

function formatNotificationTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  const { refreshUnreadCounts } = useOutletContext();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not load notifications.");
      setNotifications(await response.json());
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAllRead() {
    setMarkingRead(true);
    setError("");
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/notifications/read", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not mark notifications as read.");
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
      await refreshUnreadCounts();
    } catch (markError) {
      setError(markError.message);
    } finally {
      setMarkingRead(false);
    }
  }

  const hasUnread = notifications.some((notification) => !notification.read);

  return (
    <main className="notifications-page">
      <header className="notifications-header">
        <div>
          <p className="notifications-eyebrow">YOUR ACTIVITY</p>
          <h1>Notifications</h1>
          <p className="notifications-subtitle">Friend requests, likes, and comments in one place.</p>
        </div>
        <button
          className="notifications-read-button"
          type="button"
          onClick={markAllRead}
          disabled={!hasUnread || markingRead}
        >
          {markingRead ? "Updating..." : "Mark all read"}
        </button>
      </header>

      {error && <p className="notifications-error" role="alert">{error}</p>}

      <section className="notifications-list" aria-label="Recent notifications">
        {loading ? (
          <p className="notifications-empty">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="notifications-empty">You’re all caught up.</p>
        ) : (
          notifications.map((notification) => (
            <article
              className={`notification-row${notification.read ? "" : " notification-unread"}`}
              key={notification.id}
            >
              <Avatar
                src={notification.actor_avatar}
                name={notification.actor_username}
                className="notification-avatar"
              />
              <p className="notification-message">
                <strong>{notification.actor_username}</strong> {describeNotification(notification.type)}
              </p>
              <time className="notification-time" dateTime={notification.created_at}>
                {formatNotificationTime(notification.created_at)}
              </time>
              {!notification.read && <span className="notification-unread-dot" aria-label="Unread" />}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
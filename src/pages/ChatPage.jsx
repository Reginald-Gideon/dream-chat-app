import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "../css/Chatpage.css";
import Avatar from "../components/Avatar";
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [conversationSearch, setConversationSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // { id, content, username }
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [contactPanel, setContactPanel] = useState(null);
  const [contactStatuses, setContactStatuses] = useState([]);
  const [contactStatusIndex, setContactStatusIndex] = useState(0);
  const [contactStatusError, setContactStatusError] = useState("");
  const contactMenuRef = useRef(null);
const typingTimeoutRef = useRef(null);
const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
const otherMessage = messages.find((m) => m.username !== user?.username);
const activeConversation = conversations.find((conversation) =>
  String(conversation.conversation_id) === String(conversationId)
);
const otherPerson = activeConversation?.other_username || otherMessage?.username;
const otherAvatar = activeConversation?.other_user_avatar || otherMessage?.avatar;

  useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await fetch("https://dream-chat-app-1.onrender.com/api/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setConversations(data);
      } catch {
        // Keep the chat open if the conversation list is temporarily unavailable.
      }
    }

    fetchConversations();
    const intervalId = window.setInterval(fetchConversations, 15000);
    return () => window.clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    setContactMenuOpen(false);
    setContactPanel(null);
  }, [conversationId]);

  useEffect(() => {
    if (!contactMenuOpen) return;
    function closeMenu(event) {
      if (!contactMenuRef.current?.contains(event.target)) setContactMenuOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [contactMenuOpen]);

  const markConversationRead = useCallback(async () => {
    try {
      const response = await fetch(
        `https://dream-chat-app-1.onrender.com/api/conversations/${conversationId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) return;

      const readAt = new Date().toISOString();
      setMessages((current) => current.map((message) =>
        String(message.user_id) !== String(user.id) && !message.read_at
          ? { ...message, read_at: readAt }
          : message
      ));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }, [conversationId, token, user.id]);

  // fetch existing messages
  useEffect(() => {
    if (!conversationId) return;

    async function fetchMessages() {
      try {
        const response = await fetch(
          `https://dream-chat-app-1.onrender.com/api/conversations/${conversationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to load messages.");
        const data = await response.json();
        setMessages(data);
        markConversationRead();
      } catch (err) {
        setError(err.message);
      }
    }
    fetchMessages();
  }, [token, conversationId, user.id, markConversationRead]);

  // socket connection
  useEffect(() => {
    if (!conversationId) return;

    const socket = io("https://dream-chat-app-1.onrender.com", { auth: { token } });
    socket.emit("joinConversation", conversationId);

    socket.on("newMessage", (message) => {
      if (message.conversationId !== Number(conversationId)) return;
      if (String(message.user_id) !== String(user.id)) {
        markConversationRead();
      }
      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === message.id);
        if (alreadyExists) return prev;
        return [...prev, message];
      });
    });

    socket.on("messagesRead", ({ conversationId: readConvId, readerId }) => {
      if (readConvId !== Number(conversationId)) return;
      if (readerId === user.id) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.user_id === user.id && !m.read_at
            ? { ...m, read_at: new Date().toISOString() }
            : m
        )
      );
    });

    socket.on("messageEdited", (updated) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? { ...m, content: updated.content, edited_at: updated.edited_at }
            : m
        )
      );
    });

    socket.on("messageDeleted", ({ id, conversationId: delConvId }) => {
      if (delConvId !== Number(conversationId)) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    return () => socket.disconnect();
  }, [token, conversationId, user.id, markConversationRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations.filter((conversation) =>
    conversation.other_username.toLowerCase().includes(conversationSearch.toLowerCase())
  );

  async function markContactStatusViewed(statusId) {
    try {
      await fetch(`https://dream-chat-app-1.onrender.com/api/statuses/${statusId}/view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Viewing a status should remain available if the view count cannot be updated.
    }
  }

  async function handleViewContactStatus() {
    setContactMenuOpen(false);
    setContactStatusError("");
    setContactPanel("loading");

    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/statuses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not load this user's status.");

      const statuses = await response.json();
      const theirs = statuses.filter((status) =>
        String(status.user_id) === String(activeConversation?.other_user_id)
      );
      setContactStatuses(theirs);
      setContactStatusIndex(0);

      if (theirs.length === 0) {
        setContactPanel("empty");
        return;
      }

      setContactPanel("status");
      markContactStatusViewed(theirs[0].id);
    } catch (statusError) {
      setContactStatusError(statusError.message);
      setContactPanel("error");
    }
  }

  function moveContactStatus(direction) {
    const nextIndex = contactStatusIndex + direction;
    if (nextIndex < 0 || nextIndex >= contactStatuses.length) {
      setContactPanel(null);
      return;
    }

    setContactStatusIndex(nextIndex);
    markContactStatusViewed(contactStatuses[nextIndex].id);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!conversationId || !newMessage.trim()) return;

    try {
      const response = await fetch(
        `https://dream-chat-app-1.onrender.com/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: newMessage,
            replyToId: replyingTo ? replyingTo.id : null,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to send message.");
      setNewMessage("");
      setReplyingTo(null);
    } catch (err) {
      setError(err.message);
    }
    clearTimeout(typingTimeoutRef.current);
socketRef.current?.emit("stopTyping", { conversationId: Number(conversationId) });
  }

  async function handleEdit(messageId) {
    if (!editContent.trim()) return;
    try {
      const response = await fetch(
        `https://dream-chat-app-1.onrender.com/api/messages/${messageId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: editContent }),
        }
      );
      if (!response.ok) throw new Error("Failed to edit message.");
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(messageId) {
    if (!window.confirm("Delete this message?")) return;
    try {
      const response = await fetch(
        `https://dream-chat-app-1.onrender.com/api/messages/${messageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to delete message.");
    } catch (err) {
      setError(err.message);
    }
  }
useEffect(() => {
  if (!conversationId) return;

  const socket = io("https://dream-chat-app-1.onrender.com", { auth: { token } });
  socketRef.current = socket;
  socket.emit("joinConversation", conversationId);

  // ...all your existing listeners (newMessage, messagesRead, messageEdited, messageDeleted) stay here...

  socket.on("userTyping", ({ conversationId: typingConvId }) => {
    if (typingConvId !== Number(conversationId)) return;
    setOtherIsTyping(true);
  });

  socket.on("userStoppedTyping", ({ conversationId: typingConvId }) => {
    if (typingConvId !== Number(conversationId)) return;
    setOtherIsTyping(false);
  });

  return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [token, conversationId]);
  function startReply(msg) {
    setReplyingTo({ id: msg.id, content: msg.content, username: msg.username });
    inputRef.current?.focus();
  }
  function handleTyping(e) {
  setNewMessage(e.target.value);

  if (!socketRef.current) return;

  socketRef.current.emit("typing", { conversationId: Number(conversationId) });

  clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    socketRef.current.emit("stopTyping", { conversationId: Number(conversationId) });
  }, 2000);
}

  return (
    <div className="chat-workspace">
      <aside className="chat-list-panel" aria-label="Your conversations">
        <header className="chat-list-panel-header">
          <h1>Chats</h1>
          <button type="button" onClick={() => navigate("/new")} aria-label="Start a new chat">
            +
          </button>
        </header>
        <label className="chat-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={conversationSearch}
            onChange={(event) => setConversationSearch(event.target.value)}
            placeholder="Search or start a new chat"
            aria-label="Search conversations"
          />
        </label>
        <div className="chat-conversation-list">
          {filteredConversations.map((conversation) => {
            const unreadCount = Number(conversation.unread_count) || 0;
            const isActive = String(conversation.conversation_id) === String(conversationId);

            return (
              <button
                type="button"
                key={conversation.conversation_id}
                className={`chat-conversation-row${isActive ? " active" : ""}${unreadCount ? " unread" : ""}`}
                onClick={() => navigate(`/chat/${conversation.conversation_id}`)}
              >
                <Avatar
                  src={conversation.other_user_avatar}
                  name={conversation.other_username}
                  className="chat-list-avatar"
                />
                <span className="chat-conversation-copy">
                  <span className="chat-conversation-topline">
                    <strong>{conversation.other_username}</strong>
                    {conversation.last_message_at && (
                      <time>{formatTime(conversation.last_message_at)}</time>
                    )}
                  </span>
                  <span className={`chat-conversation-preview${conversation.last_message_unread ? " unread" : ""}`}>
                    {conversation.last_message || "Start a conversation"}
                  </span>
                </span>
                {unreadCount > 0 && (
                  <span className="chat-conversation-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
          {filteredConversations.length === 0 && (
            <p className="chat-list-empty">
              {conversationSearch ? "No matching chats." : "Your conversations will appear here."}
            </p>
          )}
        </div>
      </aside>

      <section className="chat-page" aria-label={conversationId ? `Chat with ${otherPerson || "your contact"}` : "Morphues Web welcome"}>
        <header className="chat-header">
          <button className="chat-back-button" type="button" onClick={() => navigate("/inbox?list=1")} aria-label="Back to messages">
            ←
          </button>
          {conversationId ? (
            <div className="chat-contact-anchor" ref={contactMenuRef}>
              <button
                className="chat-contact-trigger"
                type="button"
                aria-label={`Options for ${otherPerson || "contact"}`}
                aria-haspopup="menu"
                aria-expanded={contactMenuOpen}
                onClick={() => setContactMenuOpen((open) => !open)}
              >
                <Avatar src={otherAvatar} name={otherPerson} className="chat-header-avatar" />
              </button>
              {contactMenuOpen && (
                <div className="chat-contact-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => {
                    setContactMenuOpen(false);
                    setContactPanel("profile");
                  }}>
                    <span className="contact-menu-icon">@</span>
                    <span>View profile</span>
                  </button>
                  <button type="button" role="menuitem" onClick={handleViewContactStatus}>
                    <span className="contact-menu-icon">◉</span>
                    <span>View status</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="chat-header-brand-mark" aria-hidden="true">M</span>
          )}
          <div className="chat-header-details">
            <div className="chat-header-name">{otherPerson || "Morphues Web"}</div>
            <span>{otherPerson ? "Conversation" : "Your conversations, all in one place"}</span>
          </div>
        </header>

      <div className="message-list">
        {!conversationId ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon" aria-hidden="true">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
              </svg>
            </div>
            <h2>Morphues Web</h2>
            <p>Send messages, share moments, and stay close to the people who matter.</p>
            <span>Select a conversation to get started</span>
            <button type="button" onClick={() => navigate("/new")}>Start a new chat</button>
          </div>
        ) : messages.map((msg) => {
          const isMine = msg.user_id === user.id;
          const isEditing = editingId === msg.id;

          return (
            <div key={msg.id} className={`message ${isMine ? "message-mine" : "message-theirs"}`}>
              <span className="message-author">{msg.username}</span>

              {isEditing ? (
                <div className="message-edit-box">
                  <input
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="message-edit-input"
                    autoFocus
                  />
                  <div className="message-edit-buttons">
                    <button onClick={() => handleEdit(msg.id)} className="message-edit-save">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="message-edit-cancel">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {msg.reply_to_id && (
                    <div className="message-reply-quote">
                      <span className="message-reply-author">{msg.reply_username || "Deleted"}</span>
                      <span className="message-reply-text">
                        {msg.reply_content || "Original message deleted"}
                      </span>
                    </div>
                  )}

                  <span className="message-content">
                    {msg.content}
                    {msg.edited_at && <span className="message-edited-tag"> (edited)</span>}
                  </span>
                  <span className="message-time">
                    {formatTime(msg.created_at)}
                    {isMine && (
                      <span className={`read-receipt ${msg.read_at ? "read" : "sent"}`}>
                        {msg.read_at ? " ✓✓" : " ✓"}
                      </span>
                    )}
                  </span>
                  <div className="message-actions">
                    <button onClick={() => startReply(msg)}>Reply</button>
                    {isMine && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditContent(msg.content);
                          }}
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDelete(msg.id)}>Delete</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="chat-error">{error}</p>}

      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-preview-text">
            <span className="reply-preview-label">Replying to {replyingTo.username}</span>
            <span className="reply-preview-content">{replyingTo.content}</span>
          </div>
          <button className="reply-preview-cancel" onClick={() => setReplyingTo(null)}>
            ✕
          </button>
        </div>
      )}
{otherIsTyping && (
  <div className="typing-indicator">{otherPerson} is typing...</div>
)}
      {conversationId && <form onSubmit={handleSend} className="message-form">
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>}

      {contactPanel && (
        <div className="contact-overlay" onClick={() => setContactPanel(null)}>
          <section className="contact-dialog" role="dialog" aria-modal="true" aria-label="Contact details" onClick={(event) => event.stopPropagation()}>
            <button className="contact-dialog-close" type="button" onClick={() => setContactPanel(null)} aria-label="Close">×</button>
            {contactPanel === "profile" && (
              <div className="contact-profile-preview">
                <Avatar src={otherAvatar} name={otherPerson} className="contact-profile-avatar" />
                <h2>{otherPerson || "Contact"}</h2>
                <p>Morphues contact</p>
                <button type="button" className="contact-profile-status" onClick={handleViewContactStatus}>
                  View status
                </button>
              </div>
            )}
            {contactPanel === "loading" && <p className="contact-dialog-message">Loading status…</p>}
            {contactPanel === "empty" && (
              <div className="contact-profile-preview">
                <Avatar src={otherAvatar} name={otherPerson} className="contact-profile-avatar" />
                <h2>{otherPerson || "Contact"}</h2>
                <p>No active status right now.</p>
              </div>
            )}
            {contactPanel === "error" && <p className="contact-dialog-message">{contactStatusError}</p>}
            {contactPanel === "status" && contactStatuses[contactStatusIndex] && (
              <div
                className="contact-status-slide"
                style={{ background: contactStatuses[contactStatusIndex].image_url ? "#080b10" : contactStatuses[contactStatusIndex].background_color }}
              >
                {contactStatuses[contactStatusIndex].image_url && (
                  <img src={contactStatuses[contactStatusIndex].image_url} alt="" />
                )}
                {contactStatuses[contactStatusIndex].content && (
                  <p>{contactStatuses[contactStatusIndex].content}</p>
                )}
                <span className="contact-status-count">
                  {contactStatusIndex + 1} / {contactStatuses.length}
                </span>
                <button className="contact-status-next" type="button" onClick={() => moveContactStatus(1)}>
                  {contactStatusIndex + 1 < contactStatuses.length ? "Next" : "Done"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      </section>
    </div>
  );
}
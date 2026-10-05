import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "../css/Chatpage.css";
import Avatar from "../components/Avatar";
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // { id, content, username }
  const [otherIsTyping, setOtherIsTyping] = useState(false);
const typingTimeoutRef = useRef(null);
const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
const otherMessage = messages.find((m) => m.username !== user?.username);
const otherPerson = otherMessage?.username;
const otherAvatar = otherMessage?.avatar;
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  

  // fetch existing messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch(
          `https://dream-chat-app-1.onrender.com/api/conversations/${conversationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to load messages.");
        const data = await response.json();
        setMessages(data);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchMessages();
  }, [token, conversationId]);

  // socket connection
  useEffect(() => {
    const socket = io("https://dream-chat-app-1.onrender.com", { auth: { token } });
    socket.emit("joinConversation", conversationId);

    socket.on("newMessage", (message) => {
      if (message.conversationId !== Number(conversationId)) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function markAsRead() {
      try {
        await fetch(
          `https://dream-chat-app-1.onrender.com/api/conversations/${conversationId}/read`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    }
    markAsRead();
  }, [token, conversationId]);

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;

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
    <div className="chat-page">
      <div className="chat-header">
        <Avatar src={otherAvatar} name={otherPerson} className="chat-header-avatar" />
        <div className="chat-header-name">{otherPerson || "Chat"}</div>
        
      </div>

      <div className="message-list">
        {messages.map((msg) => {
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
      <form onSubmit={handleSend} className="message-form">
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
}
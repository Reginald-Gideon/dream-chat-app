import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "../css/Chatpage.css";
import AttachmentPicker from "../components/AttachmentPicker";
import MessageAttachment from "../components/MessageAttachment";
import VoiceNoteButton from "../components/VoiceNoteButton";
import { MAX_ATTACHMENT_SIZE, readFileAsDataUrl } from "../attachmentUtils";

const API_URL = "https://dream-chat-app-1.onrender.com";

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

export default function GroupChatPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState("Group");
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [sendingAttachment, setSendingAttachment] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  useEffect(() => {
    async function fetchGroupName() {
      try {
        const response = await fetch("https://dream-chat-app-1.onrender.com/api/groups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const groups = await response.json();
        const match = groups.find((g) => g.id === Number(groupId));
        if (match) setGroupName(match.name);
      } catch {
        // non-critical
      }
    }
    fetchGroupName();
  }, [token, groupId]);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch(
          `https://dream-chat-app-1.onrender.com/api/groups/${groupId}/messages`,
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
  }, [token, groupId]);

  useEffect(() => {
    const socket = io("https://dream-chat-app-1.onrender.com", { auth: { token } });
    socket.emit("joinGroup", groupId);

    socket.on("newGroupMessage", (message) => {
      if (message.groupId !== Number(groupId)) return;
      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === message.id);
        if (alreadyExists) return prev;
        return [...prev, message];
      });
    });

    socket.on("groupMessageEdited", (updated) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? { ...m, content: updated.content, edited_at: updated.edited_at }
            : m
        )
      );
    });

    socket.on("groupMessageDeleted", ({ id, groupId: delGroupId }) => {
      if (delGroupId !== Number(groupId)) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(
        `https://dream-chat-app-1.onrender.com/api/groups/${groupId}/messages`,
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
  }

  async function handleAttachmentSelected(file, attachmentLabel) {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError("Attachments must be 10 MB or smaller.");
      return;
    }

    setError("");
    setSendingAttachment(true);
    try {
      const data = await readFileAsDataUrl(file);
      const response = await fetch(`${API_URL}/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newMessage.trim() || attachmentLabel || `📎 ${file.name}`,
          replyToId: replyingTo ? replyingTo.id : null,
          attachment: { file_name: file.name, mime_type: file.type || "application/octet-stream", data },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Failed to send attachment.");
      setNewMessage("");
      setReplyingTo(null);
    } catch (uploadError) {
      setError(uploadError.message || "Failed to send attachment.");
    } finally {
      setSendingAttachment(false);
    }
  }

  async function handleEdit(messageId) {
    if (!editContent.trim()) return;
    try {
      const response = await fetch(
        `https://dream-chat-app-1.onrender.com/api/groups/messages/${messageId}`,
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
        `https://dream-chat-app-1.onrender.com/api/groups/messages/${messageId}`,
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

  function startReply(msg) {
    setReplyingTo({ id: msg.id, content: msg.content, username: msg.username });
    inputRef.current?.focus();
  }

  return (
    <div className="chat-page group-chat-page">
      <div className="chat-header">
        <button
          className="chat-back-button"
          type="button"
          onClick={() => navigate("/chat")}
          aria-label="Back to chats"
        >
          ←
        </button>
        <div className="chat-header-avatar">{getInitials(groupName)}</div>
        <div className="chat-header-details">
          <div className="chat-header-name">{groupName}</div>
          <span>Group conversation</span>
        </div>
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
                  <MessageAttachment attachment={msg.attachment} messageId={msg.id} token={token} />
                  <span className="message-time">{formatTime(msg.created_at)}</span>

                  <div className="message-actions">
                    <button onClick={() => startReply(msg)}>Reply</button>
                    {isMine && (
                      <>
                        {!msg.attachment && (
                          <button
                            onClick={() => {
                              setEditingId(msg.id);
                              setEditContent(msg.content);
                            }}
                          >
                            Edit
                          </button>
                        )}
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

      <form onSubmit={handleSend} className="message-form">
        <AttachmentPicker disabled={sendingAttachment} onSelect={handleAttachmentSelected} />
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Message the group..."
          className="message-input"
        />
        <VoiceNoteButton
          disabled={sendingAttachment}
          onSend={(file) => handleAttachmentSelected(file, "Voice note")}
          onError={setError}
        />
        <button type="submit" className="send-button" disabled={sendingAttachment}>
          <span className="send-button-text">{sendingAttachment ? "Sending…" : "Send"}</span>
          <svg className="send-button-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </form>
    </div>
  );
}
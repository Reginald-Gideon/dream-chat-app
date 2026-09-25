import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "../css/Chatpage.css";

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

  const bottomRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  // figure out who the other person is, once we have messages
  const otherPerson = messages.find((m) => m.username !== user?.username)?.username;

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

  useEffect(() => {
    const socket = io("https://dream-chat-app-1.onrender.com");
    socket.emit("joinConversation", conversationId);

    socket.on("newMessage", (message) => {
      if (message.conversationId !== Number(conversationId)) return;
      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === message.id);
        if (alreadyExists) return prev;
        return [...prev, message];
      });
    });

    return () => socket.disconnect();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          body: JSON.stringify({ content: newMessage }),
        }
      );
      if (!response.ok) throw new Error("Failed to send message.");
      setNewMessage("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-header-avatar">{getInitials(otherPerson)}</div>
        <div className="chat-header-name">{otherPerson || "Chat"}</div>
      </div>

      <div className="message-list">
        {messages.map((msg) => {
          const isMine = msg.username === user.username;
          return (
            <div key={msg.id} className={`message ${isMine ? "message-mine" : "message-theirs"}`}>
              <span className="message-author">{msg.username}</span>
              <span className="message-content">{msg.content}</span>
              <span className="message-time">{formatTime(msg.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="chat-error">{error}</p>}

      <form onSubmit={handleSend} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
}
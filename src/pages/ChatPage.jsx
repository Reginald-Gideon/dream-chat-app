import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";


export default function ChatPage() {
  const { conversationId } = useParams(); // reads the :conversationId from the URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const bottomRef = useRef(null); // reference to the bottom of the message list

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  // Fetch existing messages for this specific conversation
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
  }, [token, conversationId]); // re-fetch if the conversation changes

  // Connect the socket and join this conversation's room
  useEffect(() => {
    const socket = io("https://dream-chat-app-1.onrender.com");

    socket.emit("joinConversation", conversationId);

    socket.on("newMessage", (message) => {
      // only add it if it belongs to this conversation
      if (message.conversationId !== Number(conversationId)) return;

      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === message.id);
        if (alreadyExists) return prev;
        return [...prev, message];
      });
    });

    return () => socket.disconnect();
  }, [conversationId]); // reconnect/rejoin if the conversation changes

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
  useEffect(() => {
    // Scroll to the bottom whenever messages change
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "numeric", minute: '2-digit' });
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <span>Logged in as {user?.username}</span>
        <button onClick={() => navigate("/inbox")} className="logout-button">
          Back to messages
        </button>
        <button onClick={handleLogout} className="logout-button">Log out</button>
      </header>

      <div className="message-list">
     {messages.map((msg) => {
  const isMine = msg.username === user.username;
  return (
    <div key={msg.id} className={`message ${isMine ? "message-mine" : "message-theirs"}`}>
      <span className="message-author">{msg.username}</span>
      <span className="message-content">{msg.content}</span>
      <span className="message-timestamp">{formatTimestamp(msg.created_at)}</span>
    </div>
  );
})}
<div ref={bottomRef} /> {/* This empty div is used to scroll to the bottom */}
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
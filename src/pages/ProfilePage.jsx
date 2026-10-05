import { useState } from "react";
import { resizeImage } from "../resizeImage";
import Avatar from "../components/Avatar";
import "../css/NewChat.css";

export default function ProfilePage() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const token = localStorage.getItem("token");

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const resized = await resizeImage(file, 128);

      const response = await fetch("https://dream-chat-app-1.onrender.com/api/users/avatar", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: resized }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update avatar.");
      }

      const updatedUser = { ...user, avatar: resized };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="newchat-page">
      <h1 className="newchat-title">Your profile</h1>
      <p className="newchat-subtitle">Update your profile picture.</p>

      <div style={{ marginTop: 10 }}>
        <Avatar
          src={user?.avatar}
          name={user?.username}
          className="newchat-avatar"
          style={{ width: 80, height: 80, fontSize: 24 }}
        />
      </div>

      {error && <p className="newchat-error">{error}</p>}

      <label className="newchat-add-button" style={{ display: "inline-block", marginTop: 16, cursor: "pointer" }}>
        {uploading ? "Uploading..." : "Change photo"}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
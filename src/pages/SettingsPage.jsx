import { useState } from "react";
import { resizeImage } from "../resizeImage";
import Avatar from "../components/Avatar";
import "../css/NewChat.css";

export default function SettingsPage() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const token = localStorage.getItem("token");

  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [uploading, setUploading] = useState(false);
  const [savingField, setSavingField] = useState(null); // "username" | "email" | "password" | null
  const [messages, setMessages] = useState({}); // { username: "...", email: "...", password: "..." }

  function updateLocalUser(patch) {
    const updated = { ...user, ...patch };
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  }

  function setFieldMessage(field, text, isError) {
    setMessages((prev) => ({ ...prev, [field]: { text, isError } }));
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

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
      if (!response.ok) throw new Error("Failed to update avatar.");
      updateLocalUser({ avatar: resized });
    } catch (err) {
      setFieldMessage("avatar", err.message, true);
    } finally {
      setUploading(false);
    }
  }

  async function handleUsernameSave() {
    setSavingField("username");
    setFieldMessage("username", null);
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/users/username", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update username.");
      updateLocalUser({ username: data.username });
      setFieldMessage("username", "Username updated.", false);
    } catch (err) {
      setFieldMessage("username", err.message, true);
    } finally {
      setSavingField(null);
    }
  }

  async function handleEmailSave() {
    setSavingField("email");
    setFieldMessage("email", null);
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/users/email", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update email.");
      updateLocalUser({ email: data.email });
      setFieldMessage("email", "Email updated.", false);
    } catch (err) {
      setFieldMessage("email", err.message, true);
    } finally {
      setSavingField(null);
    }
  }

  async function handlePasswordSave() {
    setSavingField("password");
    setFieldMessage("password", null);
    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/users/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update password.");
      setCurrentPassword("");
      setNewPassword("");
      setFieldMessage("password", "Password updated.", false);
    } catch (err) {
      setFieldMessage("password", err.message, true);
    } finally {
      setSavingField(null);
    }
  }

  return (
    <div className="newchat-page">
      <h1 className="newchat-title">Settings</h1>
      <p className="newchat-subtitle">Manage your profile and account.</p>

      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "20px 0" }}>
        <Avatar src={user?.avatar} name={user?.username} className="newchat-avatar" style={{ width: 72, height: 72, fontSize: 22 }} />
        <label className="newchat-add-button" style={{ cursor: "pointer" }}>
          {uploading ? "Uploading..." : "Change photo"}
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} disabled={uploading} />
        </label>
      </div>
      {messages.avatar && (
        <p className={messages.avatar.isError ? "newchat-error" : "newchat-subtitle"}>{messages.avatar.text}</p>
      )}

      {/* Username */}
      <div style={{ marginTop: 24 }}>
        <label className="newchat-subtitle" style={{ display: "block", marginBottom: 6 }}>Username</label>
        <div className="newchat-search">
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <button className="newchat-add-button" style={{ marginTop: 8 }} onClick={handleUsernameSave} disabled={savingField === "username"}>
          {savingField === "username" ? "Saving..." : "Save username"}
        </button>
        {messages.username && (
          <p className={messages.username.isError ? "newchat-error" : "newchat-subtitle"}>{messages.username.text}</p>
        )}
      </div>

      {/* Email */}
      <div style={{ marginTop: 24 }}>
        <label className="newchat-subtitle" style={{ display: "block", marginBottom: 6 }}>Email</label>
        <div className="newchat-search">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="newchat-add-button" style={{ marginTop: 8 }} onClick={handleEmailSave} disabled={savingField === "email"}>
          {savingField === "email" ? "Saving..." : "Save email"}
        </button>
        {messages.email && (
          <p className={messages.email.isError ? "newchat-error" : "newchat-subtitle"}>{messages.email.text}</p>
        )}
      </div>

      {/* Password */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <label className="newchat-subtitle" style={{ display: "block", marginBottom: 6 }}>Change password</label>
        <div className="newchat-search" style={{ marginBottom: 8 }}>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="newchat-search">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <button className="newchat-add-button" style={{ marginTop: 8 }} onClick={handlePasswordSave} disabled={savingField === "password"}>
          {savingField === "password" ? "Saving..." : "Save password"}
        </button>
        {messages.password && (
          <p className={messages.password.isError ? "newchat-error" : "newchat-subtitle"}>{messages.password.text}</p>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import "../css/LoginPage.css";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username || !email || !password) {
      setError("Fill in all fields to continue.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("https://dream-chat-app-1.onrender.com/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/inbox";
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-icon">💬</span>
          <span className="login-brand-name">Morphues</span>
        </div>

        <h1 className="login-title">Create your account</h1>
        <p className="login-subtitle">Join the conversation.</p>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <label className="login-label" htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            className="login-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />

          <label className="login-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <label className="login-label" htmlFor="password">Password</label>
          <div className="password-input-wrap">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="password-visibility-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a15.7 15.7 0 0 1-3 3.8" />
                  <path d="M6.2 6.2C4.1 7.6 3 12 3 12s3.5 7 9 7a9.7 9.7 0 0 0 3-.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? <a href="/">Log in</a>
        </p>
      </div>
    </div>
  );
}
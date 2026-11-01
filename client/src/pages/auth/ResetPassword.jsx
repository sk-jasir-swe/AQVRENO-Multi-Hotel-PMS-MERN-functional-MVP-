import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "../Login";
import api from "../../services/api";

export default function ResetPassword() {
  const [token] = useState(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return (
      fragment.get("token") ||
      new URLSearchParams(window.location.search).get("token") ||
      ""
    );
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const response = await api.post("/auth/reset-password", {
        token,
        password,
      });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.message || "Unable to reset your password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least 8 characters, including an uppercase letter and a symbol."
    >
      {message ? (
        <>
          <p role="status">{message}</p>
          <p className="auth-foot">
            <Link to="/login">Go to sign in</Link>
          </p>
        </>
      ) : !token ? (
        <>
          <p className="error">This reset link is invalid or incomplete.</p>
          <p className="auth-foot">
            <Link to="/forgot-password">Request another reset link</Link>
          </p>
        </>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button className="primary full" disabled={busy}>
            {busy ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

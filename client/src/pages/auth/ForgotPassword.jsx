import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "../Login";
import api from "../../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post("/auth/forgot-password", { email });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.message || "Unable to request a password reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email a one-time reset link if an account matches."
    >
      <form onSubmit={submit}>
        <label htmlFor="reset-email">Email address</label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        {error && <p className="error">{error}</p>}
        {message && <p role="status">{message}</p>}
        <button className="primary full" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
        <p className="auth-foot">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

import { useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";

export default function Profile() {
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const response = await api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMessage(response.data.message);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (requestError) {
      setError(requestError.message || "Unable to change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR ACCOUNT</div>
          <h1>Profile</h1>
          <p>Manage your account details and password.</p>
        </div>
      </div>

      <div className="panel profile-card">
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="profile-role">{user.role.replaceAll("_", " ")}</span>
        </div>
      </div>

      <div className="panel profile-card">
        <div>
          <h2>Change password</h2>
          <p>
            Choose at least 8 characters, including an uppercase letter and a
            special character. Other signed-in sessions will be revoked.
          </p>
        </div>
        <form className="profile-password-form" onSubmit={submit}>
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={form.currentPassword}
            onChange={updateField}
          />
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.newPassword}
            onChange={updateField}
          />
          <label htmlFor="confirm-new-password">Confirm new password</label>
          <input
            id="confirm-new-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.confirmPassword}
            onChange={updateField}
          />
          {error && <p className="error">{error}</p>}
          {message && <p role="status">{message}</p>}
          <button className="primary" disabled={busy}>
            {busy ? "Updating…" : "Change password"}
          </button>
        </form>
      </div>
    </section>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/slices/authSlice";
import api from "../services/api";
export default function Login() {
  const [form, set] = useState({ email: "", password: "" }),
    [err, error] = useState(""),
    [busy, loading] = useState(false),
    nav = useNavigate(),
    dispatch = useDispatch();
  async function submit(e) {
    e.preventDefault();
    loading(true);
    error("");
    try {
      const r = await api.post("/auth/login", form);
      dispatch(setUser(r.data.user));
      nav("/");
    } catch (x) {
      error(x.message || "Unable to sign in");
    } finally {
      loading(false);
    }
  }
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your property.">
      <form onSubmit={submit}>
        <label>Email address</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => set({ ...form, email: e.target.value })}
          placeholder="you@hotel.com"
        />
        <label>Password</label>
        <input
          type="password"
          required
          value={form.password}
          onChange={(e) => set({ ...form, password: e.target.value })}
          placeholder="Your password"
        />
        <p className="auth-foot">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        {err && <p className="error">{err}</p>}
        <button className="primary full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="auth-foot">
          New to AQVRENO? <Link to="/register">Create hotel account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <img className="brand-logo" src="/aqvreno-logo.png" alt="AQVRENO" />
      </div>
      <div className="auth-card">
        <div className="eyebrow">HOTEL OPERATIONS, SIMPLIFIED</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
      <small className="auth-copy">
        © 2026 AQVRENO · Hotel management workspace
      </small>
    </div>
  );
}

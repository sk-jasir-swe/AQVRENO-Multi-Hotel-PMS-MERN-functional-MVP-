import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/slices/authSlice";
import api from "../services/api";
import PhoneInput from "../components/PhoneInput";
import { AuthShell } from "./Login";
export default function Register() {
  const [f, set] = useState({
      name: "",
      email: "",
      password: "",
      hotelName: "",
      address: "",
      gstin: "",
      city: "",
      phone: "",
      phoneCountryCode: "+91",
    }),
    [err, error] = useState(""),
    nav = useNavigate(),
    dispatch = useDispatch();
  function change(e) {
    set({ ...f, [e.target.name]: e.target.value });
  }
  async function submit(e) {
    e.preventDefault();
    try {
      const r = await api.post("/auth/register", f);
      dispatch(setUser(r.data.user));
      nav("/");
    } catch (x) {
      error(x.message || "Registration failed");
    }
  }
  return (
    <AuthShell
      title="Create your hotel account"
      subtitle="Start managing your property with AQVRENO."
    >
      <form onSubmit={submit}>
        <label>Your name</label>
        <input name="name" required value={f.name} onChange={change} />
        <label>Hotel name</label>
        <input
          name="hotelName"
          required
          value={f.hotelName}
          onChange={change}
        />
        <label>Hotel address</label>
        <input
          name="address"
          required
          value={f.address}
          onChange={change}
        />
        <label>GSTIN (optional, if GST-registered)</label>
        <input
          name="gstin"
          value={f.gstin}
          onChange={change}
          autoCapitalize="characters"
        />
        <label>Email</label>
        <input
          name="email"
          type="email"
          pattern="[^@\s]+@gmail\.com"
          title="Use a Gmail address ending in @gmail.com"
          placeholder="name@gmail.com"
          required
          value={f.email}
          onChange={change}
        />
        <PhoneInput
          label="Phone (optional)"
          phone={f.phone}
          phoneCountryCode={f.phoneCountryCode}
          onPhoneChange={(phone) => set({ ...f, phone })}
          onCountryCodeChange={(phoneCountryCode) =>
            set({ ...f, phoneCountryCode })
          }
        />
        <label>City (optional)</label>
        <input name="city" value={f.city} onChange={change} />
        <label>Password (8+ characters, one capital letter and one special character)</label>
        <input
          name="password"
          type="password"
          minLength="8"
          pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
          title="Use at least 8 characters, including one uppercase letter and one special character such as @"
          required
          value={f.password}
          onChange={change}
        />
        {err && <p className="error">{err}</p>}
        <button className="primary full">Create account</button>
        <p className="auth-foot">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

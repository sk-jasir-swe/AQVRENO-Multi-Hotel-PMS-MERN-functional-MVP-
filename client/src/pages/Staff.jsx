import { useEffect, useState } from "react";
import api from "../services/api";

const staffRoles = [
  ["hotel_manager", "Hotel manager"],
  ["receptionist", "Receptionist"],
  ["housekeeping", "Housekeeping"],
  ["restaurant_staff", "Restaurant staff"],
];

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "receptionist",
  });
  const [error, setError] = useState("");
  async function load() {
    try {
      const response = await api.get("/staff");
      setUsers(response.data.users);
    } catch (cause) {
      setError(cause.message || "Unable to load staff");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(event) {
    event.preventDefault();
    try {
      await api.post("/staff", form);
      setForm({ name: "", email: "", password: "", role: "receptionist" });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to create staff account");
    }
  }
  async function toggleActive(user) {
    try {
      await api.patch(`/staff/${user._id}`, { active: !user.active });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to update staff account");
    }
  }
  async function changeRole(user, role) {
    try {
      await api.patch(`/staff/${user._id}`, { role });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to update staff role");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HOTEL SETTINGS</div>
          <h1>Staff & permissions</h1>
          <p>Create team accounts and assign least-privilege roles.</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <form className="panel form-grid" onSubmit={create}>
        <div className="form-title">Add staff account</div>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            pattern="[^@\s]+@gmail\.com"
            title="Use a Gmail address ending in @gmail.com"
            placeholder="name@gmail.com"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
        </label>
        <label>
          Temporary password (8+ characters, one capital letter and one special character)
          <input
            required
            minLength="8"
            pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
            title="Use at least 8 characters, including one uppercase letter and one special character such as @"
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
        </label>
        <label>
          Role
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            {staffRoles.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button className="primary">Create staff account</button>
        </div>
      </form>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Team</h3>
            <p>{users.length} accounts</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      className="inline-select"
                      value={user.role}
                      onChange={(event) => changeRole(user, event.target.value)}
                    >
                      {staffRoles.map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{user.active ? "Active" : "Inactive"}</td>
                  <td>
                    <button
                      className="mini-btn"
                      onClick={() => toggleActive(user)}
                    >
                      {user.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

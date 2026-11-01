import { Fragment, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import ActionMenu from "../components/common/ActionMenu";
import { STAFF_PERMISSION_GROUPS } from "../utils/permissions";

const staffRoles = [
  ["hotel_manager", "Hotel manager"],
  ["receptionist", "Receptionist"],
  ["housekeeping", "Housekeeping"],
  ["restaurant_staff", "Restaurant staff"],
];

export default function Staff() {
  const currentUser = useSelector((state) => state.auth.user);
  const [users, setUsers] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [editingPermissions, setEditingPermissions] = useState("");
  const [permissionDraft, setPermissionDraft] = useState([]);
  const isOwner = currentUser?.role === "hotel_owner";
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
      setPermissionKeys(response.data.permissionKeys || []);
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
  function editPermissions(user) {
    setEditingPermissions(user._id);
    setPermissionDraft(user.permissions || []);
  }
  async function savePermissions(user) {
    try {
      const response = await api.patch(`/staff/${user._id}/permissions`, {
        permissions: permissionDraft,
      });
      setUsers((current) =>
        current.map((item) =>
          item._id === user._id
            ? { ...item, ...response.data.user }
            : item,
        ),
      );
      setEditingPermissions("");
    } catch (cause) {
      setError(cause.message || "Unable to save staff permissions");
    }
  }
  function togglePermission(permission) {
    setPermissionDraft((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission],
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HOTEL SETTINGS</div>
          <h1>Staff & permissions</h1>
          <p>
            Choose the exact hotel tasks each team member can access.
          </p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      {isOwner && <form className="panel form-grid" onSubmit={create}>
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
      </form>}
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
                <th>PERMISSIONS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <Fragment key={user._id}>
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{staffRoles.find(([value]) => value === user.role)?.[1] || user.role}</td>
                  <td>{user.active ? "Active" : "Inactive"}</td>
                  <td>
                    {["hotel_manager", "hotel_owner"].includes(user.role) ? (
                      "Management access"
                    ) : (
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => editPermissions(user)}
                      >
                        Manage access
                      </button>
                    )}
                  </td>
                  <td>
                    <ActionMenu
                      items={[
                        ...(isOwner && user.role !== "hotel_owner"
                          ? staffRoles
                          .filter(([value]) => value !== user.role)
                          .map(([value, label]) => ({
                            label: `Change role to ${label}`,
                            onClick: () => changeRole(user, value),
                          }))
                          : []),
                        ...(isOwner && user.role !== "hotel_owner" ? [{
                          label: user.active ? "Deactivate" : "Reactivate",
                          danger: user.active,
                          onClick: () => toggleActive(user),
                        }] : []),
                      ]}
                    />
                  </td>
                </tr>
                {editingPermissions === user._id && (
                  <tr>
                    <td colSpan="6">
                      <form
                        className="staff-permissions-editor"
                        onSubmit={(event) => {
                          event.preventDefault();
                          savePermissions(user);
                        }}
                      >
                        <div className="staff-permissions-heading">
                          <div>
                            <h3>Access for {user.name}</h3>
                            <p>
                              Manager accounts have full manager access and
                              cannot be restricted here.
                            </p>
                          </div>
                        </div>
                        <div className="staff-permission-groups">
                          {STAFF_PERMISSION_GROUPS.map((group) => {
                            const options = group.permissions.filter(
                              ([permission]) =>
                                permissionKeys.includes(permission),
                            );
                            return options.length ? (
                              <fieldset
                                className="staff-permission-group"
                                key={group.label}
                              >
                                <legend>{group.label}</legend>
                                {options.map(([permission, label]) => (
                                  <label key={permission}>
                                    <input
                                      type="checkbox"
                                      checked={permissionDraft.includes(
                                        permission,
                                      )}
                                      onChange={() =>
                                        togglePermission(permission)
                                      }
                                    />
                                    {label}
                                  </label>
                                ))}
                              </fieldset>
                            ) : null;
                          })}
                        </div>
                        <div className="form-actions">
                          <button className="primary" type="submit">
                            Save permissions
                          </button>
                          <button
                            className="secondary"
                            type="button"
                            onClick={() => setEditingPermissions("")}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

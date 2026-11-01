import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import ActionMenu from "../components/common/ActionMenu";
import { hasPermission } from "../utils/permissions";

export default function Housekeeping() {
  const user = useSelector((state) => state.auth.user);
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ room: "", task: "cleaning" });
  const [error, setError] = useState("");
  const isHousekeeper = user?.role === "housekeeping";
  const isManager = ["hotel_owner", "hotel_manager"].includes(user?.role);
  const canManageTasks = hasPermission(user, "housekeeping.manage");

  async function load() {
    try {
      if (!isManager) {
        const requests = [api.get("/housekeeping")];
        if (canManageTasks) requests.push(api.get("/rooms"));
        const [taskResponse, roomResponse] = await Promise.all(requests);
        setTasks(taskResponse.data.tasks);
        if (roomResponse) setRooms(roomResponse.data.items);
        setError("");
        return;
      }
      if (isHousekeeper) {
        const taskResponse = await api.get("/housekeeping");
        setTasks(taskResponse.data.tasks);
        setError("");
        return;
      }
      const [taskResponse, roomResponse, staffResponse] = await Promise.all([
        api.get("/housekeeping"),
        api.get("/rooms"),
        api.get("/staff"),
      ]);
      setTasks(taskResponse.data.tasks);
      setRooms(roomResponse.data.items);
      setStaff(staffResponse.data.users);
    } catch (cause) {
      setError(cause.message || "Unable to load housekeeping tasks");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(event) {
    event.preventDefault();
    try {
      await api.post("/housekeeping", form);
      setForm({ room: "", task: "cleaning" });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to create task");
    }
  }
  async function update(task, status) {
    try {
      await api.patch(`/housekeeping/${task._id}`, { status });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to update task");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ROOM OPERATIONS</div>
          <h1>Housekeeping</h1>
          <p>Assign room-cleaning tasks and track completion.</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      {canManageTasks && (
        <form className="panel form-grid" onSubmit={create}>
          <div className="form-title">Assign a room task</div>
          <label>
            Room
            <select
              required
              value={form.room}
              onChange={(event) =>
                setForm({ ...form, room: event.target.value })
              }
            >
              <option value="">Select a room</option>
              {rooms.map((room) => (
                <option key={room._id} value={room._id}>
                  Room {room.number} · {room.type} · {room.status}
                </option>
              ))}
            </select>
          </label>
          {isManager && <label>
            Assign to
            <select
              value={form.assignedTo || ""}
              onChange={(event) =>
                setForm({ ...form, assignedTo: event.target.value })
              }
            >
              <option value="">Unassigned</option>
              {staff
                .filter((person) => person.role === "housekeeping" && person.active)
                .map((person) => (
                  <option value={person._id} key={person._id}>
                    {person.name}
                  </option>
                ))}
            </select>
          </label>}
          <label>
            Task
            <select
              value={form.task}
              onChange={(event) => setForm({ ...form, task: event.target.value })}
            >
              <option value="cleaning">Cleaning</option>
              <option value="inspection">Inspection</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </label>
          <label>
            Notes
            <input
              value={form.notes || ""}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </label>
          <div className="form-actions">
            <button className="primary">Create task</button>
          </div>
        </form>
      )}
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Tasks</h3>
            <p>{tasks.length} tasks</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ROOM</th>
                <th>TASK</th>
                <th>ASSIGNED TO</th>
                <th>NOTES</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task._id}>
                  <td>{task.room?.number || "—"}</td>
                  <td>{task.task}</td>
                  <td>{task.assignedTo?.name || "Unassigned"}</td>
                  <td>{task.notes || "—"}</td>
                  <td>
                    <span className={`status ${task.status}`}>
                      {task.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <ActionMenu
                      items={["pending", "in_progress", "completed", "inspected"]
                        .filter((status) => status !== task.status)
                        .map((status) => ({
                          label: `Set status: ${status.replaceAll("_", " ")}`,
                          onClick: () => update(task, status),
                        }))}
                    />
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty">
                    {isHousekeeper
                      ? "No tasks are assigned to you yet."
                      : "No housekeeping tasks yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

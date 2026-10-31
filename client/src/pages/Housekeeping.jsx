import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";

export default function Housekeeping() {
  const user = useSelector((state) => state.auth.user);
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ room: "", task: "cleaning" });
  const [error, setError] = useState("");
  const isHousekeeper = user?.role === "housekeeping";

  async function load() {
    try {
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
      {!isHousekeeper && (
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
          <label>
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
          </label>
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
                    <select
                      className="inline-select"
                      value={task.status}
                      onChange={(event) => update(task, event.target.value)}
                    >
                      {["pending", "in_progress", "completed", "inspected"].map(
                        (status) => (
                          <option key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty">
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

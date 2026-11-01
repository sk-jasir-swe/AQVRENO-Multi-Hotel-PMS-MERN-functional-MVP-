import { useEffect, useState } from "react";
import api from "../services/api";

function indiaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const date = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${date.year}-${date.month}-${date.day}`;
}

function nextDate(date) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
}

export default function Maintenance() {
  const today = indiaToday();
  const [rooms, setRooms] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [maintenanceRooms, setMaintenanceRooms] = useState([]);
  const [form, setForm] = useState({
    room: "",
    startDate: today,
    endDate: nextDate(today),
    reason: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [roomResponse, maintenanceResponse] = await Promise.all([
        api.get("/rooms"),
        api.get("/maintenance"),
      ]);
      const roomItems = roomResponse.data.items;
      setRooms(roomItems);
      setBlocks(maintenanceResponse.data.items);
      setMaintenanceRooms(maintenanceResponse.data.maintenanceRooms || []);
      setForm((current) => ({
        ...current,
        room: current.room || roomItems[0]?._id || "",
      }));
    } catch (cause) {
      setError(cause.message || "Unable to load maintenance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function schedule(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.post("/maintenance", form);
      setMessage("Maintenance period scheduled.");
      setForm((current) => ({ ...current, reason: "" }));
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to schedule maintenance");
    } finally {
      setSaving(false);
    }
  }

  async function cancel(block) {
    if (!window.confirm(`Cancel maintenance for room ${block.room?.number || ""}?`))
      return;
    setError("");
    setMessage("");
    try {
      await api.patch(`/maintenance/${block._id}/cancel`);
      setMessage("Maintenance period cancelled.");
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to cancel maintenance");
    }
  }

  async function markAvailable(room) {
    if (
      !window.confirm(
        `Mark room ${room.number} as available? This removes its maintenance status.`,
      )
    )
      return;
    setError("");
    setMessage("");
    try {
      await api.patch(`/rooms/${room._id}`, { status: "available" });
      setMessage(`Room ${room.number} is now available.`);
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to update room status");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ROOM OPERATIONS</div>
          <h1>Room maintenance</h1>
          <p>
            Block a room for selected dates. New reservations cannot overlap
            with a scheduled maintenance period.
          </p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      {message && <div className="success-notice">{message}</div>}
      <form className="panel form-grid maintenance-form" onSubmit={schedule}>
        <label>
          Room
          <select
            required
            value={form.room}
            onChange={(event) =>
              setForm((current) => ({ ...current, room: event.target.value }))
            }
          >
            <option value="">Choose room</option>
            {rooms.map((room) => (
              <option key={room._id} value={room._id}>
                Room {room.number} · {room.floor || "Ground"} floor
              </option>
            ))}
          </select>
        </label>
        <label>
          Start date
          <input
            required
            type="date"
            min={today}
            value={form.startDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                startDate: event.target.value,
                endDate:
                  current.endDate <= event.target.value
                    ? nextDate(event.target.value)
                    : current.endDate,
              }))
            }
          />
        </label>
        <label>
          End date (exclusive)
          <input
            required
            type="date"
            min={nextDate(form.startDate)}
            value={form.endDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, endDate: event.target.value }))
            }
          />
        </label>
        <label>
          Reason
          <input
            required
            maxLength={500}
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({ ...current, reason: event.target.value }))
            }
            placeholder="For example: bathroom repair"
          />
        </label>
        <div className="form-actions">
          <button
            className="primary"
            disabled={saving || !rooms.length}
            type="submit"
          >
            {saving ? "Scheduling…" : "Schedule maintenance"}
          </button>
        </div>
        {!rooms.length && !loading && (
          <p className="booking-hint">Add a room before scheduling maintenance.</p>
        )}
      </form>

      <section className="panel table-panel">
          <div className="panel-head">
            <div>
              <h3>Rooms marked for maintenance</h3>
              <p>{maintenanceRooms.length} rooms</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ROOM</th>
                  <th>FLOOR</th>
                  <th>TYPE</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRooms.map((room) => (
                  <tr key={room._id}>
                    <td>Room {room.number}</td>
                    <td>{room.floor || "Ground"}</td>
                    <td>{room.type || "Standard"}</td>
                    <td>
                      <span className="status maintenance">maintenance</span>
                    </td>
                    <td>
                      <button
                        className="mini-btn muted-btn"
                        type="button"
                        onClick={() => markAvailable(room)}
                      >
                        Mark available
                      </button>
                    </td>
                  </tr>
                ))}
                {!maintenanceRooms.length && (
                  <tr>
                    <td colSpan="5" className="empty">
                      {loading
                        ? "Loading rooms…"
                        : "No rooms are currently marked for maintenance."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Maintenance periods</h3>
            <p>{blocks.length} records</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ROOM</th>
                <th>START</th>
                <th>END</th>
                <th>REASON</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block._id}>
                  <td>Room {block.room?.number || "—"}</td>
                  <td>{formatDate(block.startDate)}</td>
                  <td>{formatDate(block.endDate)}</td>
                  <td>{block.reason}</td>
                  <td>
                    <span className={`status ${block.status}`}>
                      {block.status}
                    </span>
                  </td>
                  <td>
                    {block.status === "scheduled" && (
                      <button
                        className="mini-btn muted-btn"
                        type="button"
                        onClick={() => cancel(block)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!blocks.length && (
                <tr>
                  <td colSpan="6" className="empty">
                    {loading ? "Loading maintenance…" : "No maintenance periods scheduled."}
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

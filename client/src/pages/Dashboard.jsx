import { useEffect, useState } from "react";
import {
  BedDouble,
  Users,
  CalendarCheck,
  IndianRupee,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "../services/api";
import { Link } from "react-router-dom";
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
export default function Dashboard() {
  const [data, set] = useState(null),
    [err, error] = useState(""),
    [period, setPeriod] = useState("week"),
    [dateFrom, setDateFrom] = useState(""),
    [dateTo, setDateTo] = useState("");
  useEffect(() => {
    if (period === "custom" && (!dateFrom || !dateTo)) {
      set(null);
      return;
    }
    const controller = new AbortController();
    error("");
    api
      .get("/dashboard", {
        params: { period, from: dateFrom, to: dateTo },
        signal: controller.signal,
      })
      .then((r) => set(r.data))
      .catch((e) => {
        if (!controller.signal.aborted)
          error(e.message || "Unable to load dashboard");
      });
    return () => controller.abort();
  }, [period, dateFrom, dateTo]);
  const periodLabel =
    period === "today"
      ? "today"
      : period === "month"
        ? "this month"
        : period === "custom"
          ? "selected dates"
          : "this week";
  const s = data?.stats || {};
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OVERVIEW</div>
          <h1>Property overview</h1>
          <p>Here’s what’s happening at your property today.</p>
        </div>
        <Link className="primary" to="/bookings">
          <Plus size={17} /> New reservation
        </Link>
      </div>
      {err && <div className="notice">{err}</div>}
      <div className="stat-grid">
        {[
          [
            CalendarCheck,
            "Active bookings",
            s.activeBookings ?? "—",
            "Currently active",
          ],
          [
            BedDouble,
            "Total rooms",
            s.rooms ?? "—",
            `${s.occupancy ?? 0}% occupancy`,
          ],
          [Users, "New guests", s.guests ?? "—", `Added ${periodLabel}`],
          [
            IndianRupee,
            "Collected revenue",
            money(s.revenue),
            `Payments collected ${periodLabel}`,
          ],
        ].map(([I, t, v, sub]) => (
          <div className="stat-card" key={t}>
            <div className="stat-top">
              <span>{t}</span>
              <i>
                <I size={18} />
              </i>
            </div>
            <strong>{v}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      <div className="content-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Revenue overview</h3>
              <p>Payments collected by day</p>
            </div>
            <label className="period-filter">
              <span>Show</span>
              <select
                className="inline-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                aria-label="Filter revenue and new guests by period"
              >
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="custom">Custom dates</option>
              </select>
            </label>
            {period === "custom" && (
              <>
                <label className="period-filter">
                  <span>From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    aria-label="Revenue start date"
                  />
                </label>
                <label className="period-filter">
                  <span>To</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    aria-label="Revenue end date"
                  />
                </label>
              </>
            )}
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueSeries || []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4775ee" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#4775ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#edf0f6"
                />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => money(v)} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4775ee"
                  strokeWidth={3}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Room availability</h3>
              <p>Live room status</p>
            </div>
            <Link to="/rooms" className="text-link">
              Manage <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="occupancy">
            <div className="donut" style={{ "--pct": `${s.occupancy || 0}%` }}>
              <div>
                <b>{s.occupancy || 0}%</b>
                <small>Occupied</small>
              </div>
            </div>
            <div className="legend">
              <span>
                <i className="dot blue" />
                Occupied <b>{s.occupied ?? 0}</b>
              </span>
              <span>
                <i className="dot green" />
                Available <b>{s.roomStatuses?.available ?? 0}</b>
              </span>
              <span>
                <i className="dot cleaning" />
                Cleaning <b>{s.roomStatuses?.cleaning ?? 0}</b>
              </span>
              <span>
                <i className="dot maintenance" />
                Maintenance <b>{s.roomStatuses?.maintenance ?? 0}</b>
              </span>
            </div>
          </div>
          <div className="soft-note">
            Room status counts update from your rooms and active check-ins.
          </div>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Upcoming reservations</h3>
            <p>Your next guest arrivals and departures</p>
          </div>
          <Link to="/bookings" className="text-link">
            View all <ArrowUpRight size={14} />
          </Link>
        </div>
        <ReservationTable rows={data?.upcoming || []} />
      </section>
    </>
  );
}
export function ReservationTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>GUEST</th>
            <th>ROOM</th>
            <th>CHECK IN</th>
            <th>CHECK OUT</th>
            <th>STATUS</th>
            <th>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((b) => (
              <tr key={b._id}>
                <td>
                  <b>{b.guest?.name || "Guest"}</b>
                  <small>{b.guest?.email || "—"}</small>
                </td>
                <td>{b.room?.number || "—"}</td>
                <td>{new Date(b.checkIn).toLocaleDateString()}</td>
                <td>{new Date(b.checkOut).toLocaleDateString()}</td>
                <td>
                  <span className={`status ${b.status}`}>
                    {b.status.replace("_", " ")}
                  </span>
                </td>
                <td>₹{Number(b.total).toLocaleString("en-IN")}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="empty">
                No reservations yet. Add your first booking.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

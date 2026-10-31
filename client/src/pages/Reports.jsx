import { useEffect, useState } from "react";
import api from "../services/api";

function dateString(date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default function Reports() {
  const today = dateString(new Date());
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!from || !to) return;
    const controller = new AbortController();
    api
      .get("/reports", { params: { from, to }, signal: controller.signal })
      .then((response) => setReport(response.data))
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause.message || "Unable to load report");
      });
    return () => controller.abort();
  }, [from, to]);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ANALYTICS</div>
          <h1>Reports</h1>
          <p>Bookings, room occupancy, average daily rate and payment dues.</p>
        </div>
        <div className="resource-filters">
          <label className="period-filter">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="period-filter">
            To
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="stat-grid">
        {[
          ["Reservations", report?.bookings],
          ["Cancellations", report?.cancellations],
          ["No-shows", report?.noShows],
          ["Occupied rooms now", report?.occupancy],
          ["Period occupancy", report ? `${report.occupancyRate.toFixed(1)}%` : "—"],
          ["Average daily rate", report ? `₹${report.averageDailyRate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"],
          ["Collected", `₹${(report?.collected || 0).toLocaleString("en-IN")}`],
          ["Outstanding", `₹${(report?.outstanding || 0).toLocaleString("en-IN")}`],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">{label}</div>
            <strong>{value ?? "—"}</strong>
            {label === "Outstanding" && (
              <small>{report?.outstandingBookings || 0} unpaid bookings</small>
            )}
          </div>
        ))}
      </div>
      <div className="content-grid">
        <section className="panel table-panel">
          <div className="panel-head">
            <div>
              <h3>Booking sources</h3>
              <p>Reservation origin breakdown</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>SOURCE</th>
                <th>RESERVATIONS</th>
              </tr>
            </thead>
            <tbody>
              {report?.sourceBreakdown.map((row) => (
                <tr key={row._id || "unknown"}>
                  <td>{row._id || "Unknown"}</td>
                  <td>{row.bookings}</td>
                </tr>
              ))}
              {report?.sourceBreakdown.length === 0 && (
                <tr>
                  <td colSpan="2" className="empty">
                    No reservations in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="panel table-panel">
          <div className="panel-head">
            <div>
              <h3>Payment methods</h3>
              <p>Captured payments in the selected dates</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>METHOD</th>
                <th>COLLECTED</th>
              </tr>
            </thead>
            <tbody>
              {report?.paymentBreakdown.map((row) => (
                <tr key={row._id}>
                  <td>{row._id.replaceAll("_", " ")}</td>
                  <td>₹{row.total.toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {report?.paymentBreakdown.length === 0 && (
                <tr>
                  <td colSpan="2" className="empty">
                    No captured payments in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

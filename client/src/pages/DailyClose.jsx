import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const checklistSections = [
  ["arrivalsReviewed", "Today's arrivals", "Check-in"],
  ["departuresReviewed", "Today's departures", "Check-out"],
  ["paymentsReviewed", "Payments still due", "Payment"],
  ["roomTasksReviewed", "Open room-cleaning tasks", "Room task"],
];

function money(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function DailyClose() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [savingSection, setSavingSection] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await api.get("/daily-close");
      setData(response.data);
      setError("");
    } catch (cause) {
      setError(cause.message || "Unable to load daily closing checklist");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markReviewed(section, reviewed) {
    setSavingSection(section);
    setError("");
    try {
      const response = await api.patch("/daily-close", { section, reviewed });
      setData((current) => ({
        ...current,
        checklist: response.data.checklist,
      }));
    } catch (cause) {
      setError(cause.message || "Unable to update checklist");
    } finally {
      setSavingSection("");
    }
  }

  if (!data) {
    return (
      <>
        {error && <div className="notice">{error}</div>}
        <div className="loading">Loading daily close…</div>
      </>
    );
  }

  const sections = [
    {
      key: "arrivalsReviewed",
      title: "Today's arrivals",
      description: "Confirmed reservations due to check in today.",
      items: data.arrivals,
      empty: "No arrivals scheduled today.",
      href: "/front-desk",
      detail: (booking) =>
        `Room ${booking.room?.number || "—"} · ${booking.guest?.name || "Guest"}`,
    },
    {
      key: "departuresReviewed",
      title: "Today's departures",
      description: "Guests checked in and due to leave today.",
      items: data.departures,
      empty: "No departures scheduled today.",
      href: "/front-desk",
      detail: (booking) =>
        `Room ${booking.room?.number || "—"} · ${booking.guest?.name || "Guest"}`,
    },
    {
      key: "paymentsReviewed",
      title: "Payments still due",
      description: "Today's guests with an unpaid balance.",
      items: data.paymentsDue,
      empty: "No outstanding balances for today's stays.",
      href: "/payments",
      detail: (booking) =>
        `${booking.guest?.name || "Guest"} · ${money(booking.balanceDue)} due`,
    },
    {
      key: "roomTasksReviewed",
      title: "Open room-cleaning tasks",
      description: "Room tasks that still need attention.",
      items: data.roomTasks,
      empty: "No open room tasks.",
      href: "/housekeeping",
      detail: (task) =>
        `Room ${task.room?.number || "—"} · ${task.task.replaceAll("_", " ")}`,
    },
  ];
  const allReviewed = checklistSections.every(
    ([key]) => data.checklist[key],
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FRONT DESK</div>
          <h1>Daily closing checklist</h1>
          <p>Review today's arrivals, departures, payments and room tasks.</p>
        </div>
        <span className={`status ${allReviewed ? "completed" : "pending"}`}>
          {allReviewed ? "Day reviewed" : "Review in progress"}
        </span>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="daily-close-grid">
        {sections.map((section) => (
          <section className="panel daily-close-card" key={section.key}>
            <div className="panel-head">
              <div>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>
              <span className="badge">{section.items.length}</span>
            </div>
            <div className="daily-close-items">
              {section.items.length ? (
                section.items.map((item) => (
                  <div className="daily-close-item" key={item._id}>
                    <span>{section.detail(item)}</span>
                    <Link className="text-link" to={section.href}>
                      Open
                    </Link>
                  </div>
                ))
              ) : (
                <p className="daily-close-empty">{section.empty}</p>
              )}
            </div>
            <label className="daily-close-review">
              <input
                type="checkbox"
                checked={Boolean(data.checklist[section.key])}
                disabled={savingSection === section.key}
                onChange={(event) =>
                  markReviewed(section.key, event.target.checked)
                }
              />
              Mark this section as reviewed
            </label>
          </section>
        ))}
      </div>
      {data.checklist.closedAt && (
        <p className="booking-hint">
          All sections reviewed at{" "}
          {new Date(data.checklist.closedAt).toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Kolkata",
          })}
          .
        </p>
      )}
    </>
  );
}

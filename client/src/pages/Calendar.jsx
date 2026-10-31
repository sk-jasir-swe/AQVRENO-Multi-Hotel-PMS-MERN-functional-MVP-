import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../services/api";

function dateKey(date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

const monthValue = (date) => dateKey(date).slice(0, 7);

export default function Calendar() {
  const [month, setMonth] = useState(monthValue(new Date()));
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setBookings([]);
    api
      .get("/calendar", { params: { month }, signal: controller.signal })
      .then((response) => setBookings(response.data.bookings))
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause.message || "Unable to load booking calendar");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month]);

  const days = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const first = new Date(Date.UTC(year, monthNumber - 1, 1, 12));
    const mondayOffset = (first.getUTCDay() + 6) % 7;
    const start = new Date(
      Date.UTC(year, monthNumber - 1, 1 - mondayOffset, 12),
    );
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return date;
    });
  }, [month]);

  function shiftMonth(amount) {
    const [year, monthNumber] = month.split("-").map(Number);
    setMonth(
      monthValue(new Date(Date.UTC(year, monthNumber - 1 + amount, 1, 12))),
    );
  }

  function bookingsForDay(day) {
    const start = new Date(`${dateKey(day)}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return bookings.filter(
      (booking) =>
        new Date(booking.checkIn) < end && new Date(booking.checkOut) > start,
    );
  }

  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric", timeZone: "Asia/Kolkata" },
  );
  const today = dateKey(new Date());
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = new Date(`${month}-01T00:00:00+05:30`);
  const monthEnd = new Date(Date.UTC(year, monthNumber, 1) - 330 * 60 * 1000);
  const monthBookings = bookings.filter(
    (booking) =>
      new Date(booking.checkIn) < monthEnd &&
      new Date(booking.checkOut) > monthStart,
  );
  const arrivals = bookings.filter(
    (booking) => dateKey(new Date(booking.checkIn)).slice(0, 7) === month,
  ).length;
  const departures = bookings.filter(
    (booking) => dateKey(new Date(booking.checkOut)).slice(0, 7) === month,
  ).length;
  const inHouse = bookings.filter(
    (booking) => booking.status === "checked_in",
  ).length;

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PROPERTY MANAGEMENT</div>
          <h1>Booking calendar</h1>
          <p>Room stays and reservations by date.</p>
        </div>
        <Link className="primary" to="/bookings">
          New reservation
        </Link>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="calendar-summary-grid">
        <div className="calendar-summary-card">
          <span>Reservations this month</span>
          <strong>{monthBookings.length}</strong>
          <small>Stays overlapping {monthLabel}</small>
        </div>
        <div className="calendar-summary-card">
          <span>Arrivals</span>
          <strong>{arrivals}</strong>
          <small>Check-ins during {monthLabel}</small>
        </div>
        <div className="calendar-summary-card">
          <span>Departures</span>
          <strong>{departures}</strong>
          <small>Check-outs during {monthLabel}</small>
        </div>
        <div className="calendar-summary-card">
          <span>In-house stays</span>
          <strong>{inHouse}</strong>
          <small>Checked in and overlapping this month</small>
        </div>
      </div>
      <section className="panel calendar-panel">
        <div className="calendar-panel-heading">
          <div>
            <h2>{monthLabel}</h2>
            <p>Select a reservation to open the bookings list.</p>
          </div>
          <div className="calendar-controls">
            <button
              className="secondary calendar-today"
              onClick={() => setMonth(monthValue(new Date()))}
            >
              Today
            </button>
            <div className="calendar-month-controls">
              <button
                className="secondary calendar-arrow"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <input
                type="month"
                value={month}
                onChange={(event) => {
                  if (event.target.value) setMonth(event.target.value);
                }}
                aria-label="Choose calendar month"
              />
              <button
                className="secondary calendar-arrow"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
        <div
          className="calendar-legend"
          aria-label="Reservation status legend"
        >
          <span>
            <i className="calendar-legend-dot confirmed" />
            Confirmed
          </span>
          <span>
            <i className="calendar-legend-dot checked_in" />
            In house
          </span>
        </div>
        {loading ? (
          <div className="calendar-message">Loading reservations…</div>
        ) : (
          <>
            {!monthBookings.length && (
              <div className="calendar-message">
                No reservations overlap this month.
              </div>
            )}
            <div className="calendar-scroll">
              <div className="calendar-grid">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day) => (
                    <div className="calendar-weekday" key={day}>
                      {day}
                    </div>
                  ),
                )}
                {days.map((day) => {
                  const date = dateKey(day);
                  const bookingsOnDay = bookingsForDay(day);
                  const currentMonth = monthValue(day) === month;
                  return (
                    <div
                      className={`calendar-day ${currentMonth ? "" : "outside-month"} ${date === today ? "is-today" : ""}`}
                      key={date}
                      aria-label={`${date}, ${bookingsOnDay.length} reservations`}
                    >
                      <div className="calendar-day-heading">
                        <b>{day.getUTCDate()}</b>
                        {bookingsOnDay.length > 0 && (
                          <span>{bookingsOnDay.length}</span>
                        )}
                      </div>
                      <div className="calendar-day-bookings">
                        {bookingsOnDay.slice(0, 3).map((booking) => (
                          <Link
                            className={`calendar-booking ${booking.status}`}
                            key={booking._id}
                            to="/bookings"
                            title={`${booking.guest?.name || "Guest"} · Room ${booking.room?.number || "—"} · ${booking.status === "checked_in" ? "In house" : "Confirmed"}`}
                          >
                            <b>
                              {booking.room?.number
                                ? `Room ${booking.room.number}`
                                : "Room —"}
                            </b>
                            <span>{booking.guest?.name || "Guest"}</span>
                          </Link>
                        ))}
                        {bookingsOnDay.length > 3 && (
                          <span className="calendar-more">
                            +{bookingsOnDay.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {!monthBookings.length && !loading && (
              <div className="calendar-empty-hint">
                Create a reservation to see a guest stay on this calendar.
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

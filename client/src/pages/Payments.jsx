import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { downloadCsv } from "../services/download";

function filterParams(period, dateFrom, dateTo) {
  if (period === "all") return undefined;
  if (period === "custom")
    return dateFrom && dateTo
      ? { period, from: dateFrom, to: dateTo }
      : null;
  return { period };
}

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

export default function Payments() {
  const user = useSelector((state) => state.auth.user);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({
    booking: "",
    amount: "",
    method: "cash",
    reference: "",
  });
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reconciliationDate, setReconciliationDate] = useState(
    dateString(new Date()),
  );
  const [reconciliation, setReconciliation] = useState(null);

  async function load(
    params = filterParams(period, dateFrom, dateTo),
    signal,
  ) {
    try {
      const [bookingResponse, paymentResponse] = await Promise.all([
        api.get("/bookings", { signal }),
        params === null
          ? Promise.resolve({ data: { payments: [] } })
          : api.get("/payments", { params, signal }),
      ]);
      if (signal?.aborted) return;
      setBookings(bookingResponse.data.items);
      setPayments(paymentResponse.data.payments);
    } catch (cause) {
      if (!signal?.aborted)
        setError(cause.message || "Unable to load payment records");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    load(filterParams(period, dateFrom, dateTo), controller.signal);
    return () => controller.abort();
  }, [period, dateFrom, dateTo]);
  useEffect(() => {
    if (!["hotel_owner", "hotel_manager"].includes(user?.role)) return;
    const controller = new AbortController();
    api
      .get("/payments/reconciliation", {
        params: { date: reconciliationDate },
        signal: controller.signal,
      })
      .then((response) => setReconciliation(response.data))
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause.message || "Unable to load daily reconciliation");
      });
    return () => controller.abort();
  }, [reconciliationDate, user?.role]);

  const selectedBooking = bookings.find((item) => item._id === form.booking);
  const refundsByMethod = new Map(
    (reconciliation?.refunded || []).map((item) => [item._id, item.total]),
  );
  const collectedByMethod = new Map(
    (reconciliation?.collected || []).map((item) => [item._id, item.total]),
  );
  const reconciliationMethods = [
    ...new Set([
      ...(reconciliation?.collected || []).map((item) => item._id),
      ...(reconciliation?.refunded || []).map((item) => item._id),
    ]),
  ];
  async function save(event) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/payments", { ...form, amount: Number(form.amount) });
      setForm({ booking: "", amount: "", method: "cash", reference: "" });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to record payment");
    }
  }

  async function refund(payment) {
    const remaining = payment.amount - (payment.refundAmount || 0);
    const amount = window.prompt(
      `Enter the refund amount (up to ₹${remaining}):`,
      String(remaining),
    );
    if (amount === null) return;
    try {
      await api.patch(`/payments/${payment._id}/refund`, {
        amount: Number(amount),
      });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to refund payment");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FRONT DESK</div>
          <h1>Payments</h1>
          <p>Record cash, card, UPI or bank transfers and view receipts.</p>
        </div>
        {["hotel_owner", "hotel_manager"].includes(user?.role) && (
          <button
            className="secondary"
            onClick={() =>
              downloadCsv(
                "payments",
                filterParams(period, dateFrom, dateTo),
              ).catch((cause) =>
                setError(cause.message || "Unable to export payments"),
              )
            }
            disabled={filterParams(period, dateFrom, dateTo) === null}
          >
            Export CSV
          </button>
        )}
      </div>
      {error && <div className="notice">{error}</div>}
      <form className="panel form-grid" onSubmit={save}>
        <div className="form-title">Record a payment</div>
        <label>
          Reservation
          <select
            required
            value={form.booking}
            onChange={(event) =>
              setForm({ ...form, booking: event.target.value })
            }
          >
            <option value="">Select reservation</option>
            {bookings
              .filter((booking) => booking.paymentStatus !== "paid")
              .map((booking) => (
                <option key={booking._id} value={booking._id}>
                  {booking.guest?.name || "Guest"} · Room{" "}
                  {booking.room?.number || "—"} · ₹{booking.total}
                </option>
              ))}
          </select>
        </label>
        <label>
          Amount
          <input
            required
            min="0.01"
            step="0.01"
            type="number"
            value={form.amount}
            onChange={(event) =>
              setForm({ ...form, amount: event.target.value })
            }
          />
        </label>
        <label>
          Method
          <select
            value={form.method}
            onChange={(event) => setForm({ ...form, method: event.target.value })}
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </label>
        <label>
          Reference (optional)
          <input
            value={form.reference}
            onChange={(event) =>
              setForm({ ...form, reference: event.target.value })
            }
          />
        </label>
        {selectedBooking && (
          <p className="booking-hint">
            Reservation total: ₹{selectedBooking.total}. GST is applied from
            hotel settings. Payments above remaining balance are rejected.
          </p>
        )}
        <div className="form-actions">
          <button className="primary">Save payment</button>
        </div>
      </form>
      {["hotel_owner", "hotel_manager"].includes(user?.role) && (
        <section className="panel reconciliation-panel">
          <div className="panel-head">
            <div>
              <h3>Daily payment reconciliation</h3>
              <p>Collections and refunds use India Standard Time.</p>
            </div>
            <label className="period-filter">
              Close date
              <input
                type="date"
                max={dateString(new Date())}
                value={reconciliationDate}
                onChange={(event) => setReconciliationDate(event.target.value)}
              />
            </label>
          </div>
          <div className="stat-grid">
            {[
              ["Collected", reconciliation?.totalCollected],
              ["Refunded", reconciliation?.totalRefunded],
              ["Net collected", reconciliation?.netCollected],
              ["Open balance now", reconciliation?.outstanding],
            ].map(([label, amount]) => (
              <div className="stat-card" key={label}>
                <div className="stat-top">{label}</div>
                <strong>
                  {amount === undefined ? "—" : `₹${Number(amount).toLocaleString("en-IN")}`}
                </strong>
              </div>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>METHOD</th><th>COLLECTED</th><th>REFUNDED</th><th>NET</th></tr>
              </thead>
              <tbody>
                {reconciliationMethods.map((method) => {
                  const collected = collectedByMethod.get(method) || 0;
                  const refunded = refundsByMethod.get(method) || 0;
                  return (
                    <tr key={method}>
                      <td>{method.replaceAll("_", " ")}</td>
                      <td>₹{collected.toLocaleString("en-IN")}</td>
                      <td>₹{refunded.toLocaleString("en-IN")}</td>
                      <td>₹{(collected - refunded).toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
                {reconciliationMethods.length === 0 && (
                  <tr><td className="empty" colSpan="4">No payment activity on this date.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Payment history</h3>
            <p>{payments.length} payments</p>
          </div>
          <div className="resource-filters">
            <label className="period-filter">
              <span>Date</span>
              <select
                className="inline-select"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                aria-label="Filter payment history by date"
              >
                <option value="all">All time</option>
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
                    onChange={(event) => setDateFrom(event.target.value)}
                    aria-label="Payment history start date"
                  />
                </label>
                <label className="period-filter">
                  <span>To</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(event) => setDateTo(event.target.value)}
                    aria-label="Payment history end date"
                  />
                </label>
              </>
            )}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>GUEST</th>
                <th>AMOUNT</th>
                <th>METHOD</th>
                <th>REFERENCE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                  <td>{payment.booking?.guest?.name || "—"}</td>
                  <td>₹{payment.amount}</td>
                  <td>{payment.method.replaceAll("_", " ")}</td>
                  <td>{payment.reference || "—"}</td>
                  <td>
                    {payment.status === "captured"
                      ? payment.refundAmount
                        ? `Paid · ₹${payment.refundAmount} partially refunded`
                        : "Paid"
                      : payment.status === "refunded"
                        ? "Refunded"
                        : payment.status}
                  </td>
                  <td>
                    {payment.status === "captured" &&
                      ["hotel_owner", "hotel_manager"].includes(user?.role) && (
                      <button
                        className="mini-btn muted-btn"
                        onClick={() => refund(payment)}
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty">
                    No payments recorded yet.
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

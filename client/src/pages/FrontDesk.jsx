import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { formatPhone } from "../components/PhoneInput";
import ActionMenu from "../components/common/ActionMenu";
import { formatRoomDetails } from "../utils/roomDetails";

const tabs = [
  ["arrivals", "Check in / out"],
  ["inHouse", "In house"],
  ["departures", "Departures today"],
];

function dateKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const date = Object.fromEntries(
    parts.map(({ type, value: part }) => [type, part]),
  );
  return `${date.year}-${date.month}-${date.day}`;
}

function formatActionTime(value) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";
}

function printInvoice({ invoice, hotel, booking }, windowRef) {
  const escape = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  if (!windowRef || windowRef.closed)
    throw new Error("Allow pop-ups to print the invoice");
  windowRef.document.write(`<!doctype html><html><head><title>${escape(invoice.number)}</title><style>body{font:14px Arial,sans-serif;max-width:760px;margin:40px auto;color:#222}header{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:16px}table{width:100%;border-collapse:collapse;margin:32px 0}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd}.totals{margin-left:auto;width:260px}.totals p{display:flex;justify-content:space-between}.muted{color:#666}@media print{button{display:none}}</style></head><body><header><div><h1>${escape(hotel.name)}</h1><p>${escape(hotel.address || "")} ${escape(hotel.city || "")}</p><p>GSTIN: ${escape(invoice.gstin || "—")}</p></div><div><h2>Invoice</h2><p>${escape(invoice.number)}</p><p>${new Date(invoice.createdAt).toLocaleDateString("en-IN")}</p></div></header><p><b>Guest:</b> ${escape(booking.guest?.name)} · ${escape(formatPhone(booking.guest?.phone, booking.guest?.phoneCountryCode))}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${invoice.lineItems.map((item) => `<tr><td>${escape(item.description)}</td><td>${escape(item.quantity)}</td><td>₹${escape(item.unitPrice)}</td><td>₹${escape(item.amount)}</td></tr>`).join("")}</tbody></table><div class="totals"><p><span>Subtotal</span><b>₹${escape(invoice.subtotal)}</b></p><p><span>GST</span><b>₹${escape(invoice.taxTotal)}</b></p><p><span>Total</span><b>₹${escape(invoice.total)}</b></p><p><span>Paid</span><b>₹${escape(invoice.amountPaid)}</b></p><p><span>Balance</span><b>₹${escape(invoice.total - invoice.amountPaid)}</b></p></div><p class="muted">Thank you for staying with us.</p><script>window.onload=()=>window.print()</script></body></html>`);
  windowRef.document.close();
}

export default function FrontDesk() {
  const [data, setData] = useState({
    arrivals: [],
    inHouse: [],
    departures: [],
  });
  const [tab, setTab] = useState("arrivals");
  const [error, setError] = useState("");
  const [checkInId, setCheckInId] = useState("");
  const [identity, setIdentity] = useState({
    identityDocumentType: "national_id",
    identityLast4: "",
    identityConsent: false,
  });

  const load = useCallback(async () => {
    try {
      const response = await api.get("/front-desk");
      setData(response.data);
      setError("");
    } catch (cause) {
      setError(cause.message || "Unable to load front desk");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(booking, status, verification = {}) {
    if (
      status === "no_show" &&
      !window.confirm(
        "Mark this reservation as no-show? Any payments already received will not be refunded automatically.",
      )
    )
      return;
    try {
      await api.patch(`/bookings/${booking._id}`, { status, ...verification });
      setCheckInId("");
      setIdentity({
        identityDocumentType: "national_id",
        identityLast4: "",
        identityConsent: false,
      });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to update booking");
    }
  }

  async function invoice(booking) {
    const windowRef = window.open("", "_blank");
    if (!windowRef) {
      setError("Allow pop-ups to print the invoice");
      return;
    }
    try {
      const response = await api.post(`/bookings/${booking._id}/invoice`);
      printInvoice(response.data, windowRef);
    } catch (cause) {
      windowRef.close();
      setError(cause.message || "Unable to create invoice");
    }
  }

  const rows = data[tab] || [];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">GUEST OPERATIONS</div>
          <h1>Front desk</h1>
          <p>Manage today's arrivals, current stays and departures.</p>
        </div>
        <Link className="primary" to="/bookings">
          Reservations
        </Link>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="filter-tabs">
        {tabs.map(([key, label]) => (
          <button
            className={tab === key ? "selected" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            {label} <span>{data[key]?.length || 0}</span>
          </button>
        ))}
      </div>
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>GUEST</th>
                <th>ROOM</th>
                <th>CHECK-IN</th>
                <th>CHECK-OUT</th>
                <th>ACTION TIME</th>
                <th>PAYMENT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((booking) => (
                <tr key={booking._id}>
                  <td>
                    <b>{booking.guest?.name || "Guest"}</b>
                    <small>
                      {formatPhone(
                        booking.guest?.phone,
                        booking.guest?.phoneCountryCode,
                      ) || "—"}
                    </small>
                  </td>
                  <td>
                    <b>Room {booking.room?.number || "—"}</b>
                    <small>{formatRoomDetails(booking.room)}</small>
                  </td>
                  <td>{new Date(booking.checkIn).toLocaleDateString()}</td>
                  <td>{new Date(booking.checkOut).toLocaleDateString()}</td>
                  <td>
                    {booking.status === "checked_out"
                      ? `Checked out · ${formatActionTime(booking.checkedOutAt)}`
                      : booking.checkedInAt
                        ? `Checked in · ${formatActionTime(booking.checkedInAt)}`
                        : "—"}
                  </td>
                  <td>{booking.paymentStatus}</td>
                  <td>
                    <ActionMenu
                      items={[
                        booking.status === "confirmed" && {
                          label: "Check in",
                          onClick: () =>
                            setCheckInId(
                              checkInId === booking._id ? "" : booking._id,
                            ),
                        },
                        booking.status === "checked_in" && {
                          label: "Check out",
                          onClick: () => changeStatus(booking, "checked_out"),
                        },
                        booking.status === "confirmed" &&
                          dateKey(booking.checkIn) <= dateKey(new Date()) && {
                            label: "Mark no-show",
                            danger: true,
                            onClick: () => changeStatus(booking, "no_show"),
                          },
                        { label: "Invoice", onClick: () => invoice(booking) },
                        { label: "Payment", to: "/payments" },
                      ]}
                    />
                    {checkInId === booking._id && (
                      <div className="checkin-verification">
                        <label>
                          ID type
                          <select
                            value={identity.identityDocumentType}
                            onChange={(event) =>
                              setIdentity({
                                ...identity,
                                identityDocumentType: event.target.value,
                              })
                            }
                          >
                            <option value="national_id">National ID</option>
                            <option value="passport">Passport</option>
                            <option value="drivers_license">Driver's license</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <label>
                          Last 4 digits
                          <input
                            inputMode="numeric"
                            maxLength="4"
                            pattern="[0-9]{4}"
                            required
                            value={identity.identityLast4}
                            onChange={(event) =>
                              setIdentity({
                                ...identity,
                                identityLast4: event.target.value.replace(/\D/g, "").slice(0, 4),
                              })
                            }
                          />
                        </label>
                        <label className="checkin-consent">
                          <input
                            type="checkbox"
                            checked={identity.identityConsent}
                            onChange={(event) =>
                              setIdentity({
                                ...identity,
                                identityConsent: event.target.checked,
                              })
                            }
                          />
                          Guest consents to storing ID type and last 4 digits
                        </label>
                        <button
                          className="mini-btn"
                          disabled={
                            identity.identityLast4.length !== 4 ||
                            !identity.identityConsent
                          }
                          onClick={() =>
                            changeStatus(booking, "checked_in", identity)
                          }
                        >
                          Confirm check in
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty">
                    No reservations in this list.
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

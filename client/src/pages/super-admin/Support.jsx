import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const statuses = ["open", "in_progress", "resolved"];

function formatDate(value) {
  return new Date(value).toLocaleString("en-IN");
}

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [replies, setReplies] = useState({});

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/super-admin/support");
      setTickets(response.data.tickets);
      setError("");
    } catch (cause) {
      setError(cause.message || "Unable to load support requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function updateStatus(ticketId, status) {
    setUpdating(ticketId);
    setError("");
    try {
      const response = await api.patch(`/super-admin/support/${ticketId}`, {
        status,
      });
      setTickets((current) =>
        current.map((ticket) =>
          ticket._id === ticketId ? response.data.ticket : ticket,
        ),
      );
    } catch (cause) {
      setError(cause.message || "Unable to update request");
    } finally {
      setUpdating("");
    }
  }

  async function sendReply(ticketId) {
    const message = replies[ticketId]?.trim();
    if (!message) return;
    setUpdating(ticketId);
    setError("");
    try {
      const response = await api.post(
        `/super-admin/support/${ticketId}/replies`,
        { message },
      );
      setTickets((current) =>
        current.map((ticket) =>
          ticket._id === ticketId
            ? { ...ticket, ...response.data.ticket }
            : ticket,
        ),
      );
      setReplies({ ...replies, [ticketId]: "" });
    } catch (cause) {
      setError(cause.message || "Unable to send reply");
    } finally {
      setUpdating("");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PLATFORM CONTROL</div>
          <h1>Support inbox</h1>
          <p>Issues and feedback submitted by hotel owners and staff.</p>
        </div>
        <button
          className="secondary"
          type="button"
          onClick={loadTickets}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="support-ticket-list">
        {tickets.map((ticket) => (
          <article className="panel support-ticket" key={ticket._id}>
            <div className="panel-head">
              <div>
                <span className={`status ${ticket.status}`}>
                  {ticket.status.replaceAll("_", " ")}
                </span>
                <h3>{ticket.subject}</h3>
                <p>
                  {ticket.category} · Submitted {formatDate(ticket.createdAt)}
                </p>
              </div>
              <label className="period-filter">
                Status
                <select
                  className="inline-select"
                  value={ticket.status}
                  disabled={updating === ticket._id}
                  onChange={(event) =>
                    updateStatus(ticket._id, event.target.value)
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="support-ticket-message">{ticket.message}</p>
            <div className="support-replies">
              {ticket.replies?.map((reply, index) => (
                <div className="support-reply" key={`${reply._id || reply.createdAt}-${index}`}>
                  <b>
                    {reply.author?.name || "Support"} ·{" "}
                    {reply.role?.replaceAll("_", " ")}
                  </b>
                  <p>{reply.message}</p>
                  <small>{formatDate(reply.createdAt)}</small>
                </div>
              ))}
            </div>
            <label>
              Reply to requester
              <textarea
                rows="3"
                maxLength="5000"
                value={replies[ticket._id] || ""}
                onChange={(event) =>
                  setReplies({ ...replies, [ticket._id]: event.target.value })
                }
              />
            </label>
            <button
              type="button"
              className="secondary"
              disabled={updating === ticket._id}
              onClick={() => sendReply(ticket._id)}
            >
              Send reply
            </button>
            <div className="support-details">
              <div>
                <b>Hotel</b>
                <span>{ticket.hotel?.name || "Hotel unavailable"}</span>
                <span>
                  {[
                    ticket.hotel?.address,
                    ticket.hotel?.city,
                    ticket.hotel?.country,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Address not provided"}
                </span>
                <span>{ticket.hotel?.email || "No hotel email"}</span>
                <span>
                  {ticket.hotel?.phone
                    ? `${ticket.hotel.phoneCountryCode || "+91"} ${ticket.hotel.phone}`
                    : "No hotel phone"}
                </span>
                <span>Account: {ticket.hotel?.status || "Unknown"}</span>
                <span>GSTIN: {ticket.hotel?.gstin || "Not provided"}</span>
              </div>
              <div>
                <b>Hotel owner</b>
                <span>{ticket.owner?.name || "Owner unavailable"}</span>
                <span>{ticket.owner?.email || "No owner email"}</span>
              </div>
              <div>
                <b>Submitted by</b>
                <span>{ticket.submittedBy?.name || "User unavailable"}</span>
                <span>{ticket.submittedBy?.email || "No user email"}</span>
                <span>
                  {ticket.submittedBy?.role?.replaceAll("_", " ") ||
                    "Unknown role"}
                </span>
              </div>
            </div>
          </article>
        ))}
        {!loading && tickets.length === 0 && (
          <section className="panel empty">No support requests yet.</section>
        )}
        {loading && <section className="panel empty">Loading requests…</section>}
      </div>
    </>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";

export default function Help() {
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState({
    category: "issue",
    subject: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [replies, setReplies] = useState({});
  const [loadingTickets, setLoadingTickets] = useState(true);

  const loadTickets = useCallback(async () => {
    try {
      const response = await api.get("/support/tickets");
      setTickets(response.data.tickets);
    } catch (cause) {
      setError(cause.message || "Unable to load your support requests");
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/support/tickets", form);
      setSuccess(response.data.message);
      setForm({ category: "issue", subject: "", message: "" });
      await loadTickets();
    } catch (cause) {
      setError(cause.message || "Unable to send your request");
    } finally {
      setSaving(false);
    }
  }

  async function sendReply(ticketId) {
    const message = replies[ticketId]?.trim();
    if (!message) return;
    setError("");
    try {
      await api.post(`/support/tickets/${ticketId}/replies`, { message });
      setReplies({ ...replies, [ticketId]: "" });
      await loadTickets();
    } catch (cause) {
      setError(cause.message || "Unable to send reply");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SUPPORT</div>
          <h1>Need help?</h1>
          <p>
            Send a problem or feedback to StayPro support. Your hotel and
            account details are attached automatically.
          </p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      {success && <div className="success-notice">{success}</div>}
      <form className="panel form-grid support-form" onSubmit={submit}>
        <div className="form-title">Contact support</div>
        <label>
          Request type
          <select
            value={form.category}
            onChange={(event) =>
              setForm({ ...form, category: event.target.value })
            }
          >
            <option value="issue">Report a problem</option>
            <option value="feedback">Share feedback</option>
            <option value="other">Other request</option>
          </select>
        </label>
        <label>
          Your name
          <input value={user?.name || ""} readOnly />
        </label>
        <label>
          Subject
          <input
            required
            maxLength="120"
            value={form.subject}
            onChange={(event) =>
              setForm({ ...form, subject: event.target.value })
            }
            placeholder="Briefly describe the issue"
          />
        </label>
        <label className="support-message">
          Details
          <textarea
            required
            maxLength="5000"
            rows="7"
            value={form.message}
            onChange={(event) =>
              setForm({ ...form, message: event.target.value })
            }
            placeholder="Tell us what happened and what you expected."
          />
        </label>
        <div className="form-actions">
          <button className="primary" disabled={saving}>
            {saving ? "Sending…" : "Send to support"}
          </button>
        </div>
      </form>
      <section className="support-ticket-list">
        <h2>Your support requests</h2>
        {tickets.map((ticket) => (
          <article className="panel support-ticket" key={ticket._id}>
            <div className="panel-head">
              <div>
                <span className={`status ${ticket.status}`}>
                  {ticket.status.replaceAll("_", " ")}
                </span>
                <h3>{ticket.subject}</h3>
                <p>{ticket.category} · {new Date(ticket.createdAt).toLocaleString("en-IN")}</p>
              </div>
            </div>
            <p className="support-ticket-message">{ticket.message}</p>
            <div className="support-replies">
              {ticket.replies?.map((reply, index) => (
                <div className="support-reply" key={`${reply._id || reply.createdAt}-${index}`}>
                  <b>{reply.author?.name || "StayPro support"} · {reply.role?.replaceAll("_", " ")}</b>
                  <p>{reply.message}</p>
                  <small>{new Date(reply.createdAt).toLocaleString("en-IN")}</small>
                </div>
              ))}
            </div>
            <label>
              Reply
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
              className="secondary"
              type="button"
              onClick={() => sendReply(ticket._id)}
            >
              Send reply
            </button>
          </article>
        ))}
        {!loadingTickets && tickets.length === 0 && (
          <section className="panel empty">You have not sent a support request yet.</section>
        )}
      </section>
    </>
  );
}

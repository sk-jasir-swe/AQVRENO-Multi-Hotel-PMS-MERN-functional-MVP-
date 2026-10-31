import { useEffect, useState } from "react";
import api from "../services/api";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  async function load() {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.notifications);
    } catch (cause) {
      setError(cause.message || "Unable to load notifications");
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function markRead(item) {
    try {
      await api.patch(`/notifications/${item._id}/read`);
      setNotifications((current) =>
        current.map((notification) =>
          notification._id === item._id
            ? { ...notification, readAt: new Date().toISOString() }
            : notification,
        ),
      );
    } catch (cause) {
      setError(cause.message || "Unable to mark notification as read");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACTIVITY</div>
          <h1>Notifications</h1>
          <p>Booking events, reminders and operational updates.</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <section className="panel notification-list">
        {notifications.map((item) => (
          <article
            className={`notification-item ${item.readAt ? "" : "unread"}`}
            key={item._id}
          >
            <div className="notification-mark" />
            <div className="notification-copy">
              <b>{item.subject || item.type.replaceAll("_", " ")}</b>
              <p>{item.message}</p>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </div>
            {!item.readAt && (
              <button className="mini-btn" onClick={() => markRead(item)}>
                Mark read
              </button>
            )}
          </article>
        ))}
        {notifications.length === 0 && (
          <div className="empty">You're all caught up.</div>
        )}
      </section>
    </>
  );
}

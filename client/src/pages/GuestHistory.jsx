import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { formatPhone } from "../components/PhoneInput";

export default function GuestHistory() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api
      .get(`/guests/${id}/history`, { signal: controller.signal })
      .then((response) => setData(response.data))
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause.message || "Unable to load guest history");
      });
    return () => controller.abort();
  }, [id]);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">GUEST DIRECTORY</div>
          <h1>{data?.guest.name || "Guest history"}</h1>
          <p>
            {data?.guest.gender
              ? `${data.guest.gender[0].toUpperCase()}${data.guest.gender.slice(1)} · `
              : ""}
            {data?.guest.email || "No email"} ·{" "}
            {formatPhone(data?.guest.phone, data?.guest.phoneCountryCode) ||
              "No phone"}
          </p>
        </div>
        <Link className="secondary" to="/guests">
          Back to guests
        </Link>
      </div>
      {error && <div className="notice">{error}</div>}
      {data?.guest.notes && (
        <section className="panel">
          <h3>Guest notes & preferences</h3>
          <p>{data.guest.notes}</p>
        </section>
      )}
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Stay history</h3>
            <p>{data?.bookings.length || 0} reservations</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ROOM</th>
                <th>CHECK-IN</th>
                <th>CHECK-OUT</th>
                <th>STATUS</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {data?.bookings.map((booking) => (
                <tr key={booking._id}>
                  <td>
                    {booking.room?.number || "—"} · {booking.room?.type || "—"}
                  </td>
                  <td>{new Date(booking.checkIn).toLocaleDateString()}</td>
                  <td>{new Date(booking.checkOut).toLocaleDateString()}</td>
                  <td>{booking.status.replaceAll("_", " ")}</td>
                  <td>₹{booking.total}</td>
                </tr>
              ))}
              {data && data.bookings.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty">
                    No previous stays found.
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

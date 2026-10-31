import { useEffect, useState } from "react";
import { Building2, Users, CalendarCheck, Clock } from "lucide-react";
import api from "../services/api";
export default function SuperAdmin() {
  const [data, set] = useState(null),
    [err, error] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get("/super-admin/overview")
      .then((response) => {
        if (active) set(response.data);
      })
      .catch((cause) => {
        if (active) error(cause.message || "Unable to load platform overview");
      });
    return () => {
      active = false;
    };
  }, []);
  const s = data?.stats || {};
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PLATFORM CONTROL</div>
          <h1>Platform overview</h1>
          <p>Monitor hotels and platform activity.</p>
        </div>
      </div>
      {err && <div className="notice">{err}</div>}
      <div className="stat-grid">
        {[
          [Building2, "Registered hotels", s.hotels],
          [Users, "User accounts", s.users],
          [CalendarCheck, "Reservations", s.bookings],
          [Clock, "Awaiting approval", s.pending],
        ].map(([I, t, v]) => (
          <div className="stat-card" key={t}>
            <div className="stat-top">
              <span>{t}</span>
              <i>
                <I size={18} />
              </i>
            </div>
            <strong>{v ?? "—"}</strong>
            <small>Platform total</small>
          </div>
        ))}
      </div>
    </>
  );
}

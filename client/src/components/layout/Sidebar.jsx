import { NavLink } from "react-router-dom";
const links = [
  ["/", "Dashboard"],
  ["/reservations", "Reservations"],
  ["/rooms", "Rooms"],
  ["/guests", "Guests"],
  ["/front-desk", "Front Desk"],
  ["/housekeeping", "Housekeeping"],
  ["/restaurant", "Restaurant POS"],
  ["/inventory", "Inventory"],
  ["/staff", "Staff"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
];
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">S</span>
        <span>
          Stay<span>Pro</span>
        </span>
      </div>
      <p className="side-label">WORKSPACE</p>
      <nav>
        {links.map(([to, label]) => (
          <NavLink
            end={to === "/"}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            to={to}
            key={to}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="side-bottom">
        <div className="help-card">
          <b>StayPro Support</b>
          <p>Hotel operations, simplified.</p>
        </div>
      </div>
    </aside>
  );
}

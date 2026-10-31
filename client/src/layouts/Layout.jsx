import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../redux/slices/authSlice";
import api from "../services/api";
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Users,
  LogOut,
  Hotel,
  ClipboardList,
  Settings,
  Bell,
  CreditCard,
  ClipboardCheck,
  FileBarChart,
  Contact,
  CalendarRange,
  ConciergeBell,
  LifeBuoy,
  History,
} from "lucide-react";

function indiaClock(date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).format(date),
  );
  const greeting =
    hour < 12
      ? "morning"
      : hour < 16
        ? "afternoon"
        : hour < 21
          ? "evening"
          : "night";
  return {
    greeting,
    date: new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(date),
    time: new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(date),
  };
}

export default function Layout() {
  const { user } = useSelector((s) => s.auth),
    dispatch = useDispatch(),
    nav = useNavigate();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const clock = indiaClock(now);
  const superMode = user.role === "super_admin";
  const ownerLinks = [
    ["Dashboard", "/", LayoutDashboard],
    ["Calendar", "/calendar", CalendarRange],
    ["Front desk", "/front-desk", ConciergeBell],
    ["Reservations", "/bookings", CalendarDays],
    ["Rooms", "/rooms", BedDouble],
    ["Guests", "/guests", Users],
    ["Payments", "/payments", CreditCard],
    ["Housekeeping", "/housekeeping", ClipboardCheck],
    ["Reports", "/reports", FileBarChart],
    ["Staff", "/staff", Contact],
    ["Hotel settings", "/settings", Settings],
    ...(user.role === "hotel_owner"
      ? [["Subscription", "/subscription", ClipboardList]]
      : []),
    ["Notifications", "/notifications", Bell],
    ["Restaurant", "/restaurant", ConciergeBell],
    ...(user.role === "hotel_owner"
      ? [["Staff activity", "/activity", History]]
      : []),
  ];
  const managerLinks = ownerLinks.filter(
    ([, path]) => path !== "/staff" && path !== "/settings",
  );
  const receptionistLinks = [
    ["Dashboard", "/", LayoutDashboard],
    ["Calendar", "/calendar", CalendarRange],
    ["Front desk", "/front-desk", ConciergeBell],
    ["Reservations", "/bookings", CalendarDays],
    ["Rooms", "/rooms", BedDouble],
    ["Guests", "/guests", Users],
    ["Payments", "/payments", CreditCard],
    ["Restaurant", "/restaurant", ConciergeBell],
    ["Notifications", "/notifications", Bell],
  ];
  const links = superMode
    ? [
        ["Dashboard", "/", LayoutDashboard],
        ["Hotels", "/hotels", Hotel],
        ["Plans & subscriptions", "/super-admin/subscriptions", CreditCard],
      ]
    : user.role === "hotel_owner"
      ? ownerLinks
      : user.role === "hotel_manager"
        ? managerLinks
        : user.role === "housekeeping"
          ? [
              ["Rooms", "/rooms", BedDouble],
              ["Housekeeping", "/housekeeping", ClipboardCheck],
              ["Restaurant", "/restaurant", ConciergeBell],
              ["Notifications", "/notifications", Bell],
            ]
          : user.role === "restaurant_staff"
            ? [
                ["Restaurant", "/restaurant", ConciergeBell],
                ["Notifications", "/notifications", Bell],
              ]
          : receptionistLinks;
  const navLinks = superMode
    ? [...links, ["Support inbox", "/support", LifeBuoy]]
    : [...links, ["Need help?", "/help", LifeBuoy]];
  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      dispatch(setUser(null));
      nav("/login");
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">S</span>
          <span>
            stay<span>pro</span>
          </span>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {navLinks.map(([label, to, Icon]) => (
            <NavLink
              end
              to={to}
              key={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-bottom">
          <Link className="help-card" to={superMode ? "/support" : "/help"}>
            <b>{superMode ? "Support inbox" : "Need help?"}</b>
            <p>
              {superMode
                ? "Review hotel issues and feedback."
                : "Report a problem or share feedback."}
            </p>
          </Link>
          <button className="nav-link" onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-welcome">
            {user.hotel?.name ? (
              <strong className="topbar-hotel-name">{user.hotel.name}</strong>
            ) : null}
            <b>
              Good {clock.greeting}
              {user.name ? `, ${user.name}` : ""} 👋
            </b>
            <small>
              {clock.date} · {clock.time}
            </small>
            {!user.hotel?.name && (
              <small className="topbar-context">Platform overview</small>
            )}
          </div>
          <div className="profile">
            <div className="avatar">{user.name?.[0]}</div>
            <div>
              <b>{user.name}</b>
              <small>{user.role.replaceAll("_", " ")}</small>
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

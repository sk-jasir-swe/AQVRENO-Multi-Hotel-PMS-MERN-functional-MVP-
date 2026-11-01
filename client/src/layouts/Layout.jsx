import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearAuth } from "../redux/slices/authSlice";
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
  Wrench,
} from "lucide-react";
import { hasPermission } from "../utils/permissions";

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
  const displayName = superMode
    ? user.name?.replace(/stay\s*pro/gi, "AQVRENO")
    : user.name;
  const ownerLinks = [
    ["Dashboard", "/", LayoutDashboard],
    ["Calendar", "/calendar", CalendarRange],
    ["Front desk", "/front-desk", ConciergeBell],
    ["Daily close", "/daily-close", ClipboardCheck],
    ["Reservations", "/bookings", CalendarDays],
    ["Rooms", "/rooms", BedDouble],
    ["Maintenance", "/maintenance", Wrench],
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
  const managerLinks = ownerLinks;
  const receptionistLinks = [
    ["Calendar", "/calendar", CalendarRange],
    ["Front desk", "/front-desk", ConciergeBell],
    ["Daily close", "/daily-close", ClipboardCheck],
    ["Reservations", "/bookings", CalendarDays],
    ["Rooms", "/rooms", BedDouble],
    ["Guests", "/guests", Users],
    ["Payments", "/payments", CreditCard],
    ["Housekeeping", "/housekeeping", ClipboardCheck],
    ["Reports", "/reports", FileBarChart],
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
        : receptionistLinks;
  const navLinks = superMode
    ? [...links, ["Support inbox", "/support", LifeBuoy]]
    : [...links, ["Need help?", "/help", LifeBuoy]];
  const permissionForPath = {
    "/calendar": "calendar.view",
    "/front-desk": "frontdesk.view",
    "/daily-close": "frontdesk.view",
    "/bookings": "bookings.view",
    "/rooms": "rooms.view",
    "/guests": "guests.view",
    "/payments": "payments.view",
    "/housekeeping": "housekeeping.view",
    "/restaurant": "restaurant.view",
    "/reports": "reports.view",
    "/notifications": "notifications.view",
    "/help": "support.manage",
  };
  const visibleNavLinks = navLinks.filter(([, path]) => {
    const permission = permissionForPath[path];
    return !permission || hasPermission(user, permission);
  });
  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      dispatch(clearAuth());
      nav("/login");
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/aqvreno-logo.png" alt="AQVRENO" />
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {visibleNavLinks.map(([label, to, Icon]) => (
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
          {(superMode || hasPermission(user, "support.manage")) && (
            <Link className="help-card" to={superMode ? "/support" : "/help"}>
              <b>{superMode ? "Support inbox" : "Need help?"}</b>
              <p>
                {superMode
                  ? "Review hotel issues and feedback."
                  : "Report a problem or share feedback."}
              </p>
            </Link>
          )}
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
              {displayName ? `, ${displayName}` : ""} 👋
            </b>
            <small>
              {clock.date} · {clock.time}
            </small>
            {!user.hotel?.name && (
              <small className="topbar-context">Platform overview</small>
            )}
          </div>
          <Link className="profile" to="/profile">
            <div className="avatar">{displayName?.[0]}</div>
            <div>
              <b>{displayName}</b>
              <small>{user.role.replaceAll("_", " ")}</small>
            </div>
          </Link>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

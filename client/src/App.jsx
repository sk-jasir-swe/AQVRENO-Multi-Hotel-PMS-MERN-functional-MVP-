import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearAuth, loadMe } from "./redux/slices/authSlice";
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Layout = lazy(() => import("./layouts/Layout"));
const Resource = lazy(() => import("./pages/Resource"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminHotels = lazy(() => import("./pages/super-admin/Hotels"));
const Calendar = lazy(() => import("./pages/Calendar"));
const FrontDesk = lazy(() => import("./pages/FrontDesk"));
const DailyClose = lazy(() => import("./pages/DailyClose"));
const GuestHistory = lazy(() => import("./pages/GuestHistory"));
const Payments = lazy(() => import("./pages/Payments"));
const Housekeeping = lazy(() => import("./pages/Housekeeping"));
const Reports = lazy(() => import("./pages/Reports"));
const Staff = lazy(() => import("./pages/Staff"));
const Settings = lazy(() => import("./pages/Settings"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SuperAdminSubscriptions = lazy(
  () => import("./pages/SuperAdminSubscriptions"),
);
const Help = lazy(() => import("./pages/Help"));
const Support = lazy(() => import("./pages/super-admin/Support"));
const Activity = lazy(() => import("./pages/Activity"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Restaurant = lazy(() => import("./pages/Restaurant"));
import { hasPermission, homeRouteForUser } from "./utils/permissions";

function PermissionRoute({ user, permission, children }) {
  return hasPermission(user, permission) ? (
    children
  ) : (
    <Navigate to={homeRouteForUser(user)} replace />
  );
}

function ResourcePermissionRoute({ user }) {
  const { kind } = useParams();
  const permission =
    kind === "rooms" || kind === "guests" || kind === "bookings"
      ? `${kind}.view`
      : null;
  return permission && hasPermission(user, permission) ? (
    <Resource key={kind} />
  ) : (
    <Navigate to={homeRouteForUser(user)} replace />
  );
}

export default function App() {
  const dispatch = useDispatch(),
    { user, loading } = useSelector((s) => s.auth);
  useEffect(() => {
    dispatch(loadMe());
  }, [dispatch]);
  useEffect(() => {
    const clearExpiredSession = () => dispatch(clearAuth());
    window.addEventListener("auth:session-expired", clearExpiredSession);
    return () =>
      window.removeEventListener("auth:session-expired", clearExpiredSession);
  }, [dispatch]);
  if (loading) return <div className="loading">AQVRENO</div>;
  return (
    <Suspense fallback={<div className="loading">Loading page…</div>}>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/" /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={user ? <Navigate to="/" /> : <ResetPassword />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" /> : <Register />}
      />
      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route path="profile" element={<Profile />} />
        <Route
          index
          element={
            user?.role === "super_admin" ? (
              <SuperAdmin />
            ) : ["hotel_owner", "hotel_manager"].includes(user?.role) ? (
              <Dashboard />
            ) : (
              <Navigate to={homeRouteForUser(user)} replace />
            )
          }
        />
        <Route
          path="calendar"
          element={
            <PermissionRoute user={user} permission="calendar.view">
              <Calendar />
            </PermissionRoute>
          }
        />
        <Route
          path="front-desk"
          element={
            <PermissionRoute user={user} permission="frontdesk.view">
              <FrontDesk />
            </PermissionRoute>
          }
        />
        <Route
          path="daily-close"
          element={
            <PermissionRoute user={user} permission="frontdesk.view">
              <DailyClose />
            </PermissionRoute>
          }
        />
        <Route
          path="guests/:id/history"
          element={
            <PermissionRoute user={user} permission="guests.view">
              <GuestHistory />
            </PermissionRoute>
          }
        />
        <Route
          path="payments"
          element={
            <PermissionRoute user={user} permission="payments.view">
              <Payments />
            </PermissionRoute>
          }
        />
        <Route
          path="restaurant"
          element={
            <PermissionRoute user={user} permission="restaurant.view">
              <Restaurant />
            </PermissionRoute>
          }
        />
        <Route
          path="activity"
          element={
            user?.role === "hotel_owner" ? (
              <Activity />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="maintenance"
          element={
            ["hotel_owner", "hotel_manager"].includes(user?.role) ? (
              <Maintenance />
            ) : (
              <Navigate to={homeRouteForUser(user)} replace />
            )
          }
        />
        <Route
          path="housekeeping"
          element={
            <PermissionRoute user={user} permission="housekeeping.view">
              <Housekeeping />
            </PermissionRoute>
          }
        />
        <Route
          path="reports"
          element={
            <PermissionRoute user={user} permission="reports.view">
              <Reports />
            </PermissionRoute>
          }
        />
        <Route
          path="staff"
          element={
            ["hotel_owner", "hotel_manager"].includes(user?.role) ? (
              <Staff />
            ) : (
              <Navigate to={homeRouteForUser(user)} replace />
            )
          }
        />
        <Route
          path="settings"
          element={
            ["hotel_owner", "hotel_manager"].includes(user?.role) ? (
              <Settings />
            ) : (
              <Navigate to={homeRouteForUser(user)} replace />
            )
          }
        />
        <Route
          path="subscription"
          element={
            user?.role === "hotel_owner" ? (
              <Subscription />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="notifications"
          element={
            <PermissionRoute user={user} permission="notifications.view">
              <Notifications />
            </PermissionRoute>
          }
        />
        <Route
          path="super-admin/subscriptions"
          element={<SuperAdminSubscriptions />}
        />
        <Route
          path="hotels"
          element={
            user?.role === "super_admin" ? (
              <SuperAdminHotels />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="help"
          element={
            user?.role !== "super_admin" && user?.hotel &&
            hasPermission(user, "support.manage") ? (
              <Help />
            ) : (
              <Navigate to={homeRouteForUser(user)} replace />
            )
          }
        />
        <Route
          path="support"
          element={
            user?.role === "super_admin" ? (
              <Support />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path=":kind"
          element={<ResourcePermissionRoute user={user} />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </Suspense>
  );
}

import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loadMe } from "./redux/slices/authSlice";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Layout from "./layouts/Layout";
import Resource from "./pages/Resource";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminHotels from "./pages/super-admin/Hotels";
import Calendar from "./pages/Calendar";
import FrontDesk from "./pages/FrontDesk";
import GuestHistory from "./pages/GuestHistory";
import Payments from "./pages/Payments";
import Housekeeping from "./pages/Housekeeping";
import Reports from "./pages/Reports";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";
import Subscription from "./pages/Subscription";
import Notifications from "./pages/Notifications";
import SuperAdminSubscriptions from "./pages/SuperAdminSubscriptions";
import Help from "./pages/Help";
import Support from "./pages/super-admin/Support";
import Activity from "./pages/Activity";
import Restaurant from "./pages/Restaurant";
export default function App() {
  const dispatch = useDispatch(),
    { user, loading } = useSelector((s) => s.auth);
  useEffect(() => {
    dispatch(loadMe());
  }, [dispatch]);
  if (loading) return <div className="loading">StayPro</div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route
        path="/register"
        element={user ? <Navigate to="/" /> : <Register />}
      />
      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route
          index
          element={
            user?.role === "super_admin" ? (
              <SuperAdmin />
            ) : user?.role === "housekeeping" ? (
              <Navigate to="/housekeeping" replace />
            ) : user?.role === "restaurant_staff" ? (
              <Navigate to="/restaurant" replace />
            ) : (
              <Dashboard />
            )
          }
        />
        <Route path="calendar" element={<Calendar />} />
        <Route path="front-desk" element={<FrontDesk />} />
        <Route path="guests/:id/history" element={<GuestHistory />} />
        <Route path="payments" element={<Payments />} />
        <Route
          path="restaurant"
          element={
            ["hotel_owner", "hotel_manager", "receptionist", "restaurant_staff", "housekeeping"].includes(
              user?.role,
            ) ? (
              <Restaurant />
            ) : (
              <Navigate to="/" replace />
            )
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
        <Route path="housekeeping" element={<Housekeeping />} />
        <Route path="reports" element={<Reports />} />
        <Route path="staff" element={<Staff />} />
        <Route path="settings" element={<Settings />} />
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
        <Route path="notifications" element={<Notifications />} />
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
            user?.role !== "super_admin" && user?.hotel ? (
              <Help />
            ) : (
              <Navigate to="/" replace />
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
        <Route path=":kind" element={<Resource />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

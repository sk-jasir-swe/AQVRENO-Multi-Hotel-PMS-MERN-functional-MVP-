import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
export default function MainLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Navbar />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

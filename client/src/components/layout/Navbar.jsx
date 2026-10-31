import { useSelector } from "react-redux";
export default function Navbar() {
  const user = useSelector((s) => s.auth.user);
  return (
    <header className="topbar">
      <span className="crumb">Workspace / Hotel Management</span>
      <div className="profile">
        <div className="avatar">{user?.name?.[0] || "U"}</div>
        <div>
          <b>{user?.name || "User"}</b>
          <small>{user?.role?.replaceAll("_", " ")}</small>
        </div>
      </div>
    </header>
  );
}

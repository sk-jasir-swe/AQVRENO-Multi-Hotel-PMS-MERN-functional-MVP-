export default function StatCard({ label, value, icon, caption }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <i>{icon || "◈"}</i>
      </div>
      <strong>{value ?? "—"}</strong>
      <small>{caption || "Updated just now"}</small>
    </article>
  );
}

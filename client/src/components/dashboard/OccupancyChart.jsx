export default function OccupancyChart({ value = 0 }) {
  return (
    <div className="occupancy">
      <div
        className="donut"
        style={{ "--pct": `${Math.max(0, Math.min(100, value))}%` }}
      >
        <div>
          <b>{value}%</b>
          <small>Occupancy</small>
        </div>
      </div>
    </div>
  );
}

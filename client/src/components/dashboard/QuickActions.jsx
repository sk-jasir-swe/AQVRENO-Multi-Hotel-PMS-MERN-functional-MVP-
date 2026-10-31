export default function QuickActions({ actions = [] }) {
  return (
    <div className="action-row">
      {actions.map((a) => (
        <button key={a.label} className="mini-btn" onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

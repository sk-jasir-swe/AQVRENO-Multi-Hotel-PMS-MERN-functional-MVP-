export default function Pagination({ page = 1, pages = 1, onChange }) {
  return (
    <div className="action-row">
      <button
        className="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <small>
        Page {page} of {pages}
      </small>
      <button
        className="secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

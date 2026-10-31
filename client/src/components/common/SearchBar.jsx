export default function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
}) {
  return (
    <input
      aria-label={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="search-input"
    />
  );
}

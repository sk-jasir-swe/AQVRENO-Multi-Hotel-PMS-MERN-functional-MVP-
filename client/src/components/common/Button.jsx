export default function Button({ children, variant = "primary", ...props }) {
  return (
    <button
      className={variant === "primary" ? "primary" : "secondary"}
      {...props}
    >
      {children}
    </button>
  );
}

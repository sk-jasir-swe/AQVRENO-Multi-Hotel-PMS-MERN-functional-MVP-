export function normalizeGmailAddress(email) {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@gmail\.com$/.test(normalized) ? normalized : null;
}

export function passwordValidationError(password) {
  if (typeof password !== "string" || password.length < 8)
    return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password))
    return "Password must include at least one uppercase letter";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must include at least one special character, such as @";
  return null;
}

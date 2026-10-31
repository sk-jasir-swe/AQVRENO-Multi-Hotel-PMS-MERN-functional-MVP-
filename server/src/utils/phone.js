export function isValidPhone(phone, phoneCountryCode = "+91") {
  if (
    typeof phoneCountryCode !== "string" ||
    !/^\+\d{1,3}$/.test(phoneCountryCode)
  )
    return false;
  if (phone === undefined || phone === null || phone === "") return true;
  return typeof phone === "string" && /^\d{10}$/.test(phone);
}

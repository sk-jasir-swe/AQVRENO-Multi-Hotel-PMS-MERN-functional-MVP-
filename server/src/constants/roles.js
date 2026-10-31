export const ROLES = Object.freeze([
  "super_admin",
  "hotel_owner",
  "hotel_manager",
  "receptionist",
  "housekeeping",
  "restaurant_staff",
]);
export const HOTEL_ROLES = ROLES.filter((r) => r !== "super_admin");

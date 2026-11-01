export const STAFF_PERMISSION_KEYS = [
  "calendar.view",
  "frontdesk.view",
  "bookings.view",
  "bookings.create",
  "bookings.update",
  "bookings.cancel",
  "bookings.delete",
  "rooms.view",
  "guests.view",
  "guests.create",
  "guests.update",
  "guests.delete",
  "payments.view",
  "payments.record",
  "payments.refund",
  "housekeeping.view",
  "housekeeping.manage",
  "restaurant.view",
  "restaurant.orders.create",
  "restaurant.orders.update",
  "restaurant.menu.manage",
  "restaurant.inventory.view",
  "restaurant.inventory.manage",
  "restaurant.settings.manage",
  "restaurant.income.view",
  "reports.view",
  "notifications.view",
  "support.manage",
];

export const DEFAULT_ROLE_PERMISSIONS = {
  receptionist: [
    "calendar.view",
    "frontdesk.view",
    "rooms.view",
    "bookings.view",
    "bookings.create",
    "bookings.update",
    "bookings.cancel",
    "guests.view",
    "guests.create",
    "guests.update",
    "payments.view",
    "payments.record",
    "restaurant.view",
    "restaurant.orders.create",
    "restaurant.orders.update",
    "restaurant.inventory.view",
    "notifications.view",
    "support.manage",
  ],
  housekeeping: [
    "rooms.view",
    "housekeeping.view",
    "housekeeping.manage",
    "restaurant.view",
    "restaurant.inventory.view",
    "notifications.view",
    "support.manage",
  ],
  restaurant_staff: [
    "restaurant.view",
    "restaurant.orders.create",
    "restaurant.orders.update",
    "restaurant.inventory.view",
    "notifications.view",
    "support.manage",
  ],
};

export function permissionsForUser(user) {
  if (user.permissionsCustomized) return user.permissions || [];
  return DEFAULT_ROLE_PERMISSIONS[user.role] || [];
}

const IMPLIED_PERMISSIONS = {
  "bookings.view": [
    "bookings.create",
    "bookings.update",
    "bookings.cancel",
    "bookings.delete",
  ],
  "guests.view": ["guests.create", "guests.update", "guests.delete"],
  "payments.view": ["payments.record", "payments.refund"],
  "housekeeping.view": ["housekeeping.manage"],
  "restaurant.view": STAFF_PERMISSION_KEYS.filter((key) =>
    key.startsWith("restaurant."),
  ),
  "restaurant.inventory.view": ["restaurant.inventory.manage"],
};

export function userHasPermission(user, permission) {
  const permissions = permissionsForUser(user);
  return (
    permissions.includes(permission) ||
    (IMPLIED_PERMISSIONS[permission] || []).some((key) =>
      permissions.includes(key),
    )
  );
}

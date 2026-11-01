export const STAFF_PERMISSION_GROUPS = [
  {
    label: "Front desk & reservations",
    permissions: [
      ["calendar.view", "View calendar"],
      ["frontdesk.view", "Use front desk"],
      ["bookings.view", "View reservations"],
      ["bookings.create", "Create reservations"],
      ["bookings.update", "Update and check in/out reservations"],
      ["bookings.cancel", "Cancel reservations"],
      ["bookings.delete", "Delete reservations"],
      ["rooms.view", "View rooms"],
    ],
  },
  {
    label: "Guests",
    permissions: [
      ["guests.view", "View guest records"],
      ["guests.create", "Add guests"],
      ["guests.update", "Update guest records"],
      ["guests.delete", "Delete guests"],
    ],
  },
  {
    label: "Payments",
    permissions: [
      ["payments.view", "View payment history"],
      ["payments.record", "Record payments"],
      ["payments.refund", "Issue refunds"],
    ],
  },
  {
    label: "Housekeeping",
    permissions: [
      ["housekeeping.view", "View housekeeping tasks"],
      ["housekeeping.manage", "Create and update housekeeping tasks"],
    ],
  },
  {
    label: "Restaurant & inventory",
    permissions: [
      ["restaurant.view", "View restaurant workspace"],
      ["restaurant.orders.create", "Create restaurant orders"],
      ["restaurant.orders.update", "Update restaurant orders"],
      ["restaurant.menu.manage", "Manage menu items"],
      ["restaurant.inventory.view", "View inventory"],
      ["restaurant.inventory.manage", "Add and adjust inventory"],
      ["restaurant.settings.manage", "Manage restaurant settings"],
      ["restaurant.income.view", "View restaurant income"],
    ],
  },
  {
    label: "Reports & communication",
    permissions: [
      ["reports.view", "View reports"],
      ["notifications.view", "View notifications"],
      ["support.manage", "Create and reply to support tickets"],
    ],
  },
];

export function hasPermission(user, permission) {
  if (["hotel_owner", "hotel_manager", "super_admin"].includes(user?.role))
    return true;
  const permissions = user?.permissions || [];
  const impliedPermissions = {
    "bookings.view": [
      "bookings.create",
      "bookings.update",
      "bookings.cancel",
      "bookings.delete",
    ],
    "guests.view": ["guests.create", "guests.update", "guests.delete"],
    "payments.view": ["payments.record", "payments.refund"],
    "housekeeping.view": ["housekeeping.manage"],
    "restaurant.view": permissions.filter((key) =>
      key.startsWith("restaurant."),
    ),
    "restaurant.inventory.view": ["restaurant.inventory.manage"],
  };
  return (
    permissions.includes(permission) ||
    (impliedPermissions[permission] || []).some((key) =>
      permissions.includes(key),
    )
  );
}

export function homeRouteForUser(user) {
  if (user?.role === "super_admin") return "/";
  const routes = [
    ["frontdesk.view", "/front-desk"],
    ["bookings.view", "/bookings"],
    ["calendar.view", "/calendar"],
    ["rooms.view", "/rooms"],
    ["guests.view", "/guests"],
    ["payments.view", "/payments"],
    ["housekeeping.view", "/housekeeping"],
    ["restaurant.view", "/restaurant"],
    ["reports.view", "/reports"],
    ["notifications.view", "/notifications"],
    ["support.manage", "/help"],
  ];
  return routes.find(([permission]) => hasPermission(user, permission))?.[1]
    || "/profile";
}

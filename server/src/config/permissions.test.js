import test from "node:test";
import assert from "node:assert/strict";
import {
  permissionsForUser,
  userHasPermission,
} from "./permissions.js";

test("default staff permissions follow the role defaults", () => {
  assert.equal(
    permissionsForUser({ role: "receptionist" }).includes("bookings.create"),
    true,
  );
  assert.equal(
    userHasPermission({ role: "housekeeping" }, "housekeeping.view"),
    true,
  );
});

test("custom permissions imply necessary read access only", () => {
  const user = {
    role: "receptionist",
    permissionsCustomized: true,
    permissions: ["restaurant.inventory.manage", "payments.refund"],
  };

  assert.equal(userHasPermission(user, "restaurant.view"), true);
  assert.equal(userHasPermission(user, "restaurant.inventory.view"), true);
  assert.equal(userHasPermission(user, "payments.view"), true);
  assert.equal(userHasPermission(user, "bookings.view"), false);
  assert.equal(userHasPermission(user, "payments.record"), false);
});

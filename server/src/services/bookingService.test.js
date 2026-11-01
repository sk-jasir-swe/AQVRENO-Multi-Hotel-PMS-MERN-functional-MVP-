import test from "node:test";
import assert from "node:assert/strict";
import Booking from "../models/Booking.js";
import MaintenanceBlock from "../models/MaintenanceBlock.js";
import Room from "../models/Room.js";
import {
  acquireRoomBookingLock,
  assertRoomAvailable,
  isCheckInDateReached,
} from "./bookingService.js";

test("overlapping reservations are rejected", async () => {
  const originalExists = Booking.exists;
  const originalMaintenanceExists = MaintenanceBlock.exists;
  Booking.exists = async () => ({ _id: "existing-booking" });
  MaintenanceBlock.exists = async () => null;

  try {
    await assert.rejects(
      assertRoomAvailable({
        hotel: "hotel-id",
        room: "room-id",
        checkIn: new Date("2026-11-01T00:00:00Z"),
        checkOut: new Date("2026-11-03T00:00:00Z"),
      }),
      (error) => error.status === 409,
    );
  } finally {
    Booking.exists = originalExists;
    MaintenanceBlock.exists = originalMaintenanceExists;
  }
});

test("maintenance blocks reject overlapping reservations", async () => {
  const originalExists = Booking.exists;
  const originalMaintenanceExists = MaintenanceBlock.exists;
  Booking.exists = async () => null;
  MaintenanceBlock.exists = async () => ({ _id: "maintenance-id" });

  try {
    await assert.rejects(
      assertRoomAvailable({
        hotel: "hotel-id",
        room: "room-id",
        checkIn: new Date("2026-11-01T00:00:00Z"),
        checkOut: new Date("2026-11-03T00:00:00Z"),
      }),
      (error) => error.status === 409,
    );
  } finally {
    Booking.exists = originalExists;
    MaintenanceBlock.exists = originalMaintenanceExists;
  }
});

test("room booking lock prevents a concurrent reservation", async () => {
  const originalFindOneAndUpdate = Room.findOneAndUpdate;
  Room.findOneAndUpdate = () => ({
    select: () => ({
      lean: async () => null,
    }),
  });

  try {
    await assert.rejects(
      acquireRoomBookingLock({ hotel: "hotel-id", room: "room-id" }),
      (error) => error.status === 409,
    );
  } finally {
    Room.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("room booking lock is released after booking creation", async () => {
  const originalFindOneAndUpdate = Room.findOneAndUpdate;
  const originalUpdateOne = Room.updateOne;
  let releaseQuery;
  Room.findOneAndUpdate = () => ({
    select: () => ({
      lean: async () => ({ _id: "room-id" }),
    }),
  });
  Room.updateOne = async (query, update) => {
    releaseQuery = { query, update };
  };

  try {
    const lock = await acquireRoomBookingLock({
      hotel: "hotel-id",
      room: "room-id",
    });
    await lock.release();
    assert.equal(releaseQuery.query.hotel, "hotel-id");
    assert.equal(releaseQuery.query._id, "room-id");
    assert.ok(releaseQuery.query.bookingLockId);
    assert.deepEqual(releaseQuery.update.$unset, {
      bookingLockId: 1,
      bookingLockExpiresAt: 1,
    });
  } finally {
    Room.findOneAndUpdate = originalFindOneAndUpdate;
    Room.updateOne = originalUpdateOne;
  }
});

test("no-show can only be marked on or after the check-in date in India", () => {
  assert.equal(
    isCheckInDateReached(
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-10-31T18:00:00Z"),
    ),
    false,
  );
  assert.equal(
    isCheckInDateReached(
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-10-31T19:00:00Z"),
    ),
    true,
  );
});

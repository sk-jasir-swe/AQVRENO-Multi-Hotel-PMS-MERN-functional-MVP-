import { randomUUID } from "node:crypto";
import Booking from "../models/Booking.js";
import MaintenanceBlock from "../models/MaintenanceBlock.js";
import Room from "../models/Room.js";

const IST_OFFSET_MS = 330 * 60 * 1000;

export async function assertRoomAvailable({
  hotel,
  room,
  checkIn,
  checkOut,
  excludeId,
}) {
  const overlap = {
    hotel,
    room,
    status: { $nin: ["cancelled", "checked_out", "no_show"] },
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) },
  };
  if (excludeId) overlap._id = { $ne: excludeId };
  const [bookingOverlap, maintenanceOverlap] = await Promise.all([
    Booking.exists(overlap),
    MaintenanceBlock.exists({
      hotel,
      room,
      status: "scheduled",
      startDate: { $lt: new Date(checkOut) },
      endDate: { $gt: new Date(checkIn) },
    }),
  ]);
  if (bookingOverlap || maintenanceOverlap) {
    const e = new Error("Room is not available for the selected dates");
    e.status = 409;
    throw e;
  }
  return true;
}

async function acquireRoomLock({ hotel, room, requireAvailable }) {
  const lockId = randomUUID();
  const now = new Date();
  const query = {
    _id: room,
    hotel,
    $or: [
      { bookingLockExpiresAt: { $exists: false } },
      { bookingLockExpiresAt: null },
      { bookingLockExpiresAt: { $lte: now } },
    ],
  };
  if (requireAvailable) query.status = "available";
  const lock = await Room.findOneAndUpdate(
    query,
    {
      $set: {
        bookingLockId: lockId,
        bookingLockExpiresAt: new Date(now.getTime() + 2 * 60 * 1000),
      },
    },
    { new: true },
  )
    .select("_id")
    .lean();

  if (!lock) {
    const error = new Error(
      "This room is being updated by another staff member. Please try again.",
    );
    error.status = 409;
    throw error;
  }

  return {
    async release() {
      await Room.updateOne(
        { _id: room, hotel, bookingLockId: lockId },
        { $unset: { bookingLockId: 1, bookingLockExpiresAt: 1 } },
      );
    },
  };
}

export function acquireRoomBookingLock({ hotel, room }) {
  return acquireRoomLock({ hotel, room, requireAvailable: true });
}

export function acquireRoomMaintenanceLock({ hotel, room }) {
  return acquireRoomLock({ hotel, room, requireAvailable: false });
}

export function isCheckInDateReached(checkIn, now = new Date()) {
  const dateKey = (date) =>
    new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  return dateKey(now) >= dateKey(new Date(checkIn));
}

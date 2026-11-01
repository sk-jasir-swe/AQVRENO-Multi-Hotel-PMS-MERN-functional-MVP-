import Booking from "../models/Booking.js";
import MaintenanceBlock from "../models/MaintenanceBlock.js";
import Room from "../models/Room.js";
import { assertSubscriptionCapacity } from "../services/subscriptionLimits.js";
import { recordActivity } from "../services/activityLog.js";

export async function list(req, res) {
  const hotel = req.user.hotel._id;
  const rooms = await Room.find({ hotel }).sort({ createdAt: -1 }).limit(250);
  const checkedInRoomIds = new Set(
    (await Booking.distinct("room", { hotel, status: "checked_in" })).map(
      String,
    ),
  );
  res.json({
    items: rooms.map((room) => ({
      ...room.toObject(),
      status: checkedInRoomIds.has(String(room._id)) ? "occupied" : room.status,
    })),
  });
}

export async function create(req, res) {
  const {
    number,
    type,
    floor,
    capacity,
    airConditioning,
    price,
    status,
  } = req.body;
  if (
    (floor !== undefined && typeof floor !== "string") ||
    (capacity !== undefined &&
      (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)) ||
    (airConditioning !== undefined &&
      typeof airConditioning !== "boolean")
  ) {
    return res.status(400).json({
      message: "Enter a valid floor, whole-number capacity and AC selection",
    });
  }
  if (
    typeof number !== "string" ||
    !number.trim() ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return res.status(400).json({
      message: "Room number and a valid non-negative nightly price are required",
    });
  }
  if (
    status !== undefined &&
    !["available", "cleaning", "maintenance"].includes(status)
  ) {
    return res.status(400).json({ message: "Invalid initial room status" });
  }
  const limitCheck = await assertSubscriptionCapacity(req.user.hotel._id, "rooms");
  if (!limitCheck.allowed)
    return res.status(403).json({ message: limitCheck.message });
  const room = await Room.create({
    hotel: req.user.hotel._id,
    number: number.trim(),
    type,
    floor: typeof floor === "string" && floor.trim() ? floor.trim() : "Ground",
    capacity: capacity === undefined ? 2 : Number(capacity),
    airConditioning: airConditioning === true,
    price: Number(price),
    status: status || "available",
  });
  await recordActivity(req, "room.created", "Room", room._id, {
    number: room.number,
  });
  res.status(201).json({ item: room });
}

export async function update(req, res) {
  const hotel = req.user.hotel._id;
  if (req.body.status === "available") {
    const checkedIn = await Booking.exists({
      hotel,
      room: req.params.id,
      status: "checked_in",
    });
    if (checkedIn)
      return res.status(409).json({
        message: "Room cannot be marked available while a guest is checked in",
      });
  }
  const updates = { ...req.body };
  delete updates.hotel;
  delete updates._id;
  const room = await Room.findOneAndUpdate(
    { _id: req.params.id, hotel },
    updates,
    { new: true, runValidators: true },
  );
  if (!room) return res.status(404).json({ message: "Room not found" });
  await recordActivity(req, "room.updated", "Room", room._id, {
    status: room.status,
  });
  res.json({ item: room });
}

export async function remove(req, res) {
  const hotel = req.user.hotel._id;
  const room = await Room.findOne({ _id: req.params.id, hotel });
  if (!room) return res.status(404).json({ message: "Room not found" });
  const [hasBookings, hasMaintenanceHistory] = await Promise.all([
    Booking.exists({
      hotel,
      room: room._id,
    }),
    MaintenanceBlock.exists({
      hotel,
      room: room._id,
    }),
  ]);
  if (hasBookings || hasMaintenanceHistory)
    return res.status(409).json({
      message: "Rooms with reservation or maintenance history cannot be deleted",
    });
  await room.deleteOne();
  await recordActivity(req, "room.deleted", "Room", room._id, {
    number: room.number,
  });
  res.json({ message: "Deleted" });
}

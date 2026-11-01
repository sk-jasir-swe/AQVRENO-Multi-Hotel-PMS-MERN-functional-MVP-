import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import MaintenanceBlock from "../models/MaintenanceBlock.js";
import Room from "../models/Room.js";
import { recordActivity } from "../services/activityLog.js";
import { acquireRoomMaintenanceLock } from "../services/bookingService.js";

function parseDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  )
    return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

export async function listMaintenanceBlocks(req, res) {
  const [items, maintenanceRooms] = await Promise.all([
    MaintenanceBlock.find({ hotel: req.user.hotel._id })
      .sort({ startDate: 1, createdAt: -1 })
      .limit(250)
      .populate("room", "number type floor")
      .populate("createdBy", "name role"),
    Room.find({ hotel: req.user.hotel._id, status: "maintenance" })
      .select("number type floor status")
      .sort({ number: 1 })
      .limit(250),
  ]);
  res.json({ items, maintenanceRooms });
}

export async function createMaintenanceBlock(req, res) {
  const { room, reason } = req.body;
  const startDate = parseDate(req.body.startDate);
  const endDate = parseDate(req.body.endDate);
  if (
    !mongoose.isValidObjectId(room) ||
    !startDate ||
    !endDate ||
    startDate >= endDate ||
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.trim().length > 500
  )
    return res.status(400).json({
      message: "Choose a room, valid start and end dates, and a reason",
    });

  const hotel = req.user.hotel._id;
  if (!(await Room.exists({ _id: room, hotel })))
    return res.status(404).json({ message: "Room not found for this hotel" });

  const lock = await acquireRoomMaintenanceLock({ hotel, room });
  let block;
  try {
    const activeBooking = await Booking.exists({
      hotel,
      room,
      status: { $in: ["confirmed", "checked_in"] },
      checkIn: { $lt: endDate },
      checkOut: { $gt: startDate },
    });
    if (activeBooking)
      return res.status(409).json({
        message: "This room has a reservation during the selected dates",
      });

    const overlap = await MaintenanceBlock.exists({
      hotel,
      room,
      status: "scheduled",
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    });
    if (overlap)
      return res.status(409).json({
        message: "This room already has a maintenance block during those dates",
      });

    block = await MaintenanceBlock.create({
      hotel,
      room,
      startDate,
      endDate,
      reason: reason.trim(),
      createdBy: req.user._id,
    });
  } finally {
    await lock.release();
  }

  await recordActivity(req, "maintenance.scheduled", "MaintenanceBlock", block._id, {
    room: String(room),
    startDate,
    endDate,
    reason: reason.trim(),
  });
  const item = await MaintenanceBlock.findById(block._id)
    .populate("room", "number type floor")
    .populate("createdBy", "name role");
  res.status(201).json({ item });
}

export async function cancelMaintenanceBlock(req, res) {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: "Maintenance block not found" });
  const hotel = req.user.hotel._id;
  const block = await MaintenanceBlock.findOne({
    _id: req.params.id,
    hotel,
  });
  if (!block)
    return res.status(404).json({ message: "Maintenance block not found" });
  if (block.status === "cancelled")
    return res.status(409).json({ message: "Maintenance block is already cancelled" });
  block.status = "cancelled";
  block.cancelledAt = new Date();
  await block.save();
  await recordActivity(req, "maintenance.cancelled", "MaintenanceBlock", block._id, {
    room: String(block.room),
    startDate: block.startDate,
    endDate: block.endDate,
  });
  res.json({ item: block });
}

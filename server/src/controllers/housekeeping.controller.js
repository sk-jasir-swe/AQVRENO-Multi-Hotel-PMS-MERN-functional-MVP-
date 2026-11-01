import Booking from "../models/Booking.js";
import Housekeeping from "../models/Housekeeping.js";
import Room from "../models/Room.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

export async function housekeepingList(req, res) {
  const filter = { hotel: req.user.hotel._id };
  if (req.user.role === "housekeeping") filter.assignedTo = req.user._id;
  const tasks = await Housekeeping.find(filter)
    .sort({ dueAt: 1, createdAt: -1 })
    .populate("room assignedTo", "number type name email");
  res.json({ tasks });
}

export async function createHousekeeping(req, res) {
  const hotel = req.user.hotel._id;
  if (!["cleaning", "inspection", "maintenance"].includes(req.body.task || "cleaning"))
    return res.status(400).json({ message: "Choose a valid housekeeping task" });
  const room = await Room.findOne({ _id: req.body.room, hotel });
  if (!room) return res.status(404).json({ message: "Room not found" });
  let assignedTo;
  if (req.body.assignedTo) {
    assignedTo = await User.findOne({
      _id: req.body.assignedTo,
      hotel,
      role: "housekeeping",
      active: true,
    });
    if (!assignedTo)
      return res.status(400).json({ message: "Select an active housekeeping staff member" });
  }
  const task = await Housekeeping.create({
    hotel,
    room: room._id,
    createdBy: req.user._id,
    assignedTo: assignedTo?._id,
    task: req.body.task || "cleaning",
    notes: req.body.notes,
    dueAt: req.body.dueAt,
  });
  room.status = req.body.task === "maintenance" ? "maintenance" : "cleaning";
  await room.save();
  if (assignedTo)
    await Notification.create({
      hotel,
      user: assignedTo._id,
      type: "housekeeping_assigned",
      channel: "in_app",
      subject: "Housekeeping task assigned",
      message: `${req.body.task || "cleaning"} task assigned for room ${room.number}`,
      status: "sent",
      sentAt: new Date(),
    });
  res.status(201).json({ task });
}

export async function updateHousekeeping(req, res) {
  const task = await Housekeeping.findOne({
    _id: req.params.id,
    hotel: req.user.hotel._id,
  }).populate("room");
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (
    req.user.role === "housekeeping" &&
    String(task.assignedTo) !== String(req.user._id)
  ) {
    return res.status(403).json({ message: "You can only update tasks assigned to you" });
  }
  if (
    req.body.status &&
    !["pending", "in_progress", "completed", "inspected"].includes(req.body.status)
  )
    return res.status(400).json({ message: "Invalid task status" });
  const previousStatus = task.status;
  if (req.body.status) task.status = req.body.status;
  if (typeof req.body.notes === "string") task.notes = req.body.notes;
  if (req.body.status === "completed" || req.body.status === "inspected") {
    const checkedIn = await Booking.exists({
      hotel: req.user.hotel._id,
      room: task.room._id,
      status: "checked_in",
    });
    const anotherOpenTask = await Housekeeping.exists({
      _id: { $ne: task._id },
      hotel: req.user.hotel._id,
      room: task.room._id,
      status: { $in: ["pending", "in_progress"] },
    });
    if (!checkedIn && !anotherOpenTask) {
      await Room.updateOne(
        { _id: task.room._id, hotel: req.user.hotel._id },
        { $set: { status: "available" } },
      );
    }
  }
  await task.save();
  if (
    ["completed", "inspected"].includes(task.status) &&
    previousStatus !== task.status &&
    task.createdBy &&
    String(task.createdBy) !== String(req.user._id)
  ) {
    await Notification.create({
      hotel: req.user.hotel._id,
      user: task.createdBy,
      type: "housekeeping_completed",
      channel: "in_app",
      subject: "Housekeeping task updated",
      message: `Room ${task.room.number} task marked ${task.status}`,
      status: "sent",
      sentAt: new Date(),
    });
  }
  res.json({ task });
}

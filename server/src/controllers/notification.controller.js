import Notification from "../models/Notification.js";

export async function notificationsList(req, res) {
  const notifications = await Notification.find({
    hotel: req.user.hotel._id,
    user: req.user._id,
    channel: "in_app",
  })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ notifications });
}

export async function markNotificationRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, hotel: req.user.hotel._id, user: req.user._id },
    { $set: { status: "read", readAt: new Date() } },
    { new: true },
  );
  if (!notification)
    return res.status(404).json({ message: "Notification not found" });
  res.json({ notification });
}

import ActivityLog from "../models/ActivityLog.js";

export async function listActivity(req, res) {
  const items = await ActivityLog.find({ hotel: req.user.hotel._id })
    .sort({ createdAt: -1 })
    .limit(500)
    .populate("actor", "name email role");
  res.json({ items });
}

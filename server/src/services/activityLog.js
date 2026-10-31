import ActivityLog from "../models/ActivityLog.js";

export async function recordActivity(req, action, entity, entityId, details = {}) {
  await ActivityLog.create({
    hotel: req.user.hotel._id,
    actor: req.user._id,
    action,
    entity,
    entityId,
    details,
  });
}

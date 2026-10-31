import Room from "../models/Room.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";

const staffRoles = [
  "hotel_manager",
  "receptionist",
  "housekeeping",
  "restaurant_staff",
];

export async function assertSubscriptionCapacity(hotel, resource) {
  const subscription = await Subscription.findOne({
    hotel,
    status: { $in: ["active", "trialing"] },
  })
    .sort({ createdAt: -1 })
    .populate("plan");
  if (!subscription?.plan || !subscription.plan.active)
    return {
      allowed: false,
      message: "Choose an active subscription plan before adding resources",
    };
  if (
    subscription.currentPeriodStart &&
    subscription.currentPeriodStart.getTime() > Date.now()
  )
    return {
      allowed: false,
      message: "Your subscription has not started yet",
    };
  if (
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd.getTime() < Date.now()
  )
    return {
      allowed: false,
      message: "Your subscription has expired; renew it before adding resources",
    };

  const limit = subscription.plan.limits?.[resource];
  if (!Number.isInteger(limit) || limit < 1)
    return {
      allowed: false,
      message: `Your subscription does not have a valid ${resource} limit; contact support`,
    };

  const count =
    resource === "rooms"
      ? await Room.countDocuments({ hotel })
      : await User.countDocuments({ hotel, role: { $in: staffRoles } });
  if (count >= limit)
    return {
      allowed: false,
      message: `Your ${subscription.plan.name} plan allows up to ${limit} ${resource}`,
      limit,
      current: count,
    };
  return { allowed: true };
}

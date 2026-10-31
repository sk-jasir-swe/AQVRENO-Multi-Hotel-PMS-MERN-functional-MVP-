import mongoose from "mongoose";
import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import Room from "../models/Room.js";
import User from "../models/User.js";

export async function listPlans(req, res) {
  const plans = await Plan.find({ active: true }).sort({ priceMonthly: 1 });
  res.json({ plans });
}

export async function currentSubscription(req, res) {
  const hotel = req.user.hotel._id;
  const [subscription, rooms, staff] = await Promise.all([
    Subscription.findOne({ hotel }).sort({ createdAt: -1 }).populate("plan"),
    Room.countDocuments({ hotel }),
    User.countDocuments({
      hotel,
      role: {
        $in: ["hotel_manager", "receptionist", "housekeeping", "restaurant_staff"],
      },
    }),
  ]);
  res.json({ subscription, usage: { rooms, staff, properties: 1 } });
}

export async function requestSubscription(req, res) {
  if (!mongoose.isValidObjectId(req.body.plan))
    return res.status(400).json({ message: "Choose a valid plan" });
  const plan = await Plan.findOne({ _id: req.body.plan, active: true });
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  const subscription = await Subscription.create({
    hotel: req.user.hotel._id,
    plan: plan._id,
    status: "trialing",
    paymentStatus: "pending",
    billingCycle: req.body.billingCycle === "yearly" ? "yearly" : "monthly",
  });
  res.status(201).json({ subscription });
}

export async function superAdminPlans(req, res) {
  const plans = await Plan.find().sort({ createdAt: -1 });
  res.json({ plans });
}

export async function createPlan(req, res) {
  const { name, priceMonthly, priceYearly } = req.body;
  if (!name || !Number.isFinite(Number(priceMonthly)) || !Number.isFinite(Number(priceYearly)))
    return res.status(400).json({ message: "Plan name and monthly/yearly prices are required" });
  const plan = await Plan.create({
    name: name.trim(),
    priceMonthly: Number(priceMonthly),
    priceYearly: Number(priceYearly),
    limits: req.body.limits || {},
    features: Array.isArray(req.body.features) ? req.body.features : [],
  });
  res.status(201).json({ plan });
}

export async function updatePlan(req, res) {
  const updates = {};
  if (typeof req.body.active === "boolean") updates.active = req.body.active;
  if (typeof req.body.name === "string" && req.body.name.trim())
    updates.name = req.body.name.trim();
  for (const field of ["priceMonthly", "priceYearly"]) {
    if (req.body[field] !== undefined) {
      const value = Number(req.body[field]);
      if (!Number.isFinite(value) || value < 0)
        return res.status(400).json({ message: `${field} must be a non-negative number` });
      updates[field] = value;
    }
  }
  if (req.body.limits && typeof req.body.limits === "object") {
    for (const field of ["properties", "rooms", "staff"]) {
      if (req.body.limits[field] !== undefined) {
        const value = Number(req.body.limits[field]);
        if (!Number.isInteger(value) || value < 1)
          return res.status(400).json({ message: `${field} limit must be a positive integer` });
      }
    }
    updates.limits = req.body.limits;
  }
  if (req.body.features !== undefined) {
    if (!Array.isArray(req.body.features) || !req.body.features.every((item) => typeof item === "string"))
      return res.status(400).json({ message: "Features must be a list of strings" });
    updates.features = req.body.features;
  }
  const plan = await Plan.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  res.json({ plan });
}

export async function superAdminSubscriptions(req, res) {
  const subscriptions = await Subscription.find()
    .sort({ createdAt: -1 })
    .populate("hotel plan");
  res.json({ subscriptions });
}

export async function updateSubscription(req, res) {
  const updates = {};
  if (req.body.status) {
    if (!["trialing", "active", "past_due", "cancelled", "expired"].includes(req.body.status))
      return res.status(400).json({ message: "Invalid subscription status" });
    updates.status = req.body.status;
  }
  if (req.body.paymentStatus) {
    if (!["pending", "paid", "past_due", "refunded"].includes(req.body.paymentStatus))
      return res.status(400).json({ message: "Invalid subscription payment status" });
    updates.paymentStatus = req.body.paymentStatus;
    if (req.body.paymentStatus === "paid") updates.lastPaymentAt = new Date();
  }
  if (req.body.currentPeriodEnd !== undefined) {
    const end = req.body.currentPeriodEnd ? new Date(req.body.currentPeriodEnd) : null;
    if (end && !Number.isFinite(end.getTime()))
      return res.status(400).json({ message: "Invalid renewal date" });
    updates.currentPeriodEnd = end;
  }
  if (req.body.currentPeriodStart !== undefined) {
    const start = req.body.currentPeriodStart ? new Date(req.body.currentPeriodStart) : null;
    if (start && !Number.isFinite(start.getTime()))
      return res.status(400).json({ message: "Invalid period start date" });
    updates.currentPeriodStart = start;
  }
  const subscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true },
  ).populate("hotel plan");
  if (!subscription)
    return res.status(404).json({ message: "Subscription not found" });
  res.json({ subscription });
}

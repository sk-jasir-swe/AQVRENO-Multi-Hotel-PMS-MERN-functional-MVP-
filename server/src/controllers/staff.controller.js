import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { assertSubscriptionCapacity } from "../services/subscriptionLimits.js";
import { recordActivity } from "../services/activityLog.js";
import {
  normalizeGmailAddress,
  passwordValidationError,
} from "../utils/accountValidation.js";

const STAFF_CREATE_ROLES = ["hotel_manager", "receptionist", "housekeeping", "restaurant_staff"];
const HOTEL_ROLES = ["hotel_owner", ...STAFF_CREATE_ROLES];

export async function createStaff(req, res) {
  const { name, email, password, role } = req.body;
  const normalizedEmail = normalizeGmailAddress(email);
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    !password ||
    !STAFF_CREATE_ROLES.includes(role)
  )
    return res.status(400).json({ message: "Name, email, password and valid hotel role are required" });
  if (!normalizedEmail)
    return res.status(400).json({
      message: "Use a valid Gmail address ending in @gmail.com",
    });
  const passwordError = passwordValidationError(password);
  if (passwordError) return res.status(400).json({ message: passwordError });
  if (await User.exists({ email: normalizedEmail }))
    return res.status(409).json({ message: "An account already uses this email" });
  const capacity = await assertSubscriptionCapacity(req.user.hotel._id, "staff");
  if (!capacity.allowed)
    return res.status(403).json({ message: capacity.message });
  const user = await User.create({
    name,
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
    role,
    hotel: req.user.hotel._id,
  });
  await recordActivity(req, "staff.created", "User", user._id, {
    name: user.name,
    role: user.role,
  });
  res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role, active: user.active },
  });
}

export async function listStaff(req, res) {
  const users = await User.find({
    hotel: req.user.hotel._id,
    role: { $in: HOTEL_ROLES },
  })
    .select("name email role active createdAt")
    .sort({ createdAt: -1 });
  res.json({ users });
}

export async function updateStaff(req, res) {
  const updates = {};
  if (typeof req.body.name === "string") updates.name = req.body.name.trim();
  if (typeof req.body.active === "boolean") updates.active = req.body.active;
  if (req.body.role) {
    if (!STAFF_CREATE_ROLES.includes(req.body.role))
      return res.status(400).json({ message: "Invalid staff role" });
    updates.role = req.body.role;
  }
  if (req.body.password) {
    const passwordError = passwordValidationError(req.body.password);
    if (passwordError)
      return res.status(400).json({ message: passwordError });
    updates.password = await bcrypt.hash(req.body.password, 12);
  }
  const user = await User.findOneAndUpdate(
    {
      _id: req.params.id,
      hotel: req.user.hotel._id,
      role: { $in: STAFF_CREATE_ROLES },
    },
    updates,
    { new: true, runValidators: true },
  ).select("name email role active");
  if (!user) return res.status(404).json({ message: "Staff member not found" });
  await recordActivity(req, "staff.updated", "User", user._id, {
    name: user.name,
    role: user.role,
    active: user.active,
  });
  res.json({ user });
}

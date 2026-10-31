import jwt from "jsonwebtoken";
import User from "../models/User.js";
export async function protect(req, res, next) {
  try {
    const token =
      req.cookies?.aqvreno_token ||
      req.cookies?.staypro_token ||
      req.headers.authorization?.replace("Bearer ", "");
    if (!token)
      return res.status(401).json({ message: "Authentication required" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).populate("hotel");
    if (!user || !user.active)
      return res.status(401).json({ message: "Invalid account" });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Session expired or invalid" });
  }
}
export function allowRoles(...roles) {
  return (req, res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ message: "Insufficient permissions" });
}
export function requireApprovedHotel(req, res, next) {
  if (req.user.role === "super_admin") return next();
  if (!req.user.hotel || req.user.hotel.status !== "approved")
    return res.status(403).json({ message: "Your hotel is awaiting approval" });
  next();
}

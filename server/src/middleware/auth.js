import jwt from "jsonwebtoken";
import RefreshSession from "../models/RefreshSession.js";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { isValidSessionUser } from "../services/authSessionService.js";
import { userHasPermission } from "../config/permissions.js";

export async function protect(req, res, next) {
  try {
    const token =
      req.cookies?.aqvreno_token ||
      req.cookies?.staypro_token ||
      req.headers.authorization?.replace("Bearer ", "");
    if (!token)
      return res.status(401).json({ message: "Authentication required" });
    const payload = jwt.verify(token, env.jwtSecret);
    if (
      payload.type !== "access" ||
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string"
    )
      return res.status(401).json({ message: "Invalid session" });

    const [session, storedUser] = await Promise.all([
      RefreshSession.findOne({
        sessionId: payload.sid,
        userId: payload.sub,
        revoked: false,
        expiresAt: { $gt: new Date() },
      }),
      User.findById(payload.sub).populate("hotel"),
    ]);
    if (!session)
      return res.status(401).json({ message: "Session expired or revoked" });

    const user = isValidSessionUser(storedUser, session);
    if (!user) {
      await RefreshSession.updateOne(
        { _id: session._id, revoked: false },
        { $set: { revoked: true } },
      );
      return res.status(401).json({ message: "Account or hotel access is unavailable" });
    }
    const now = new Date();
    if (!session.lastUsedAt || now - session.lastUsedAt > 60_000) {
      const updated = await RefreshSession.updateOne(
        { _id: session._id, revoked: false },
        { $set: { lastUsedAt: now } },
      );
      if (!updated.matchedCount)
        return res.status(401).json({ message: "Session expired or revoked" });
      session.lastUsedAt = now;
    }
    req.user = user;
    req.authSession = session;
    req.tenantId =
      user.role === "super_admin" ? null : user.hotel?._id || null;
    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    )
      return res.status(401).json({ message: "Session expired or invalid" });
    return next(error);
  }
}
export function allowRoles(...roles) {
  return (req, res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ message: "Insufficient permissions" });
}
export function requirePermission(permission) {
  return (req, res, next) => {
    if (["hotel_owner", "hotel_manager"].includes(req.user?.role))
      return next();
    const requiredPermissions =
      typeof permission === "function" ? permission(req) : permission;
    const required = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];
    if (required.some((key) => userHasPermission(req.user, key)))
      return next();
    return res.status(403).json({ message: "Insufficient permissions" });
  };
}
export function requireApprovedHotel(req, res, next) {
  if (req.user.role === "super_admin") return next();
  if (
    !req.tenantId ||
    !req.user.hotel ||
    req.user.hotel.status !== "approved"
  )
    return res.status(403).json({ message: "Your hotel is awaiting approval" });
  next();
}

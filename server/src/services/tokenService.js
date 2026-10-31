import jwt from "jsonwebtoken";
import crypto from "node:crypto";
export function createAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      hotel: user.hotel ? String(user.hotel._id || user.hotel) : null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" },
  );
}
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
export function createOpaqueToken() {
  return crypto.randomBytes(48).toString("hex");
}

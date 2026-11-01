import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import RefreshSession from "../models/RefreshSession.js";
import User from "../models/User.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export function hashRefreshToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user, sessionId) {
  return jwt.sign(
    { sub: user._id.toString(), sid: sessionId, type: "access" },
    env.jwtSecret,
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
  );
}

function signRefreshToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      sid: sessionId,
      type: "refresh",
      jti: randomBytes(16).toString("base64url"),
    },
    env.jwtSecret,
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
  );
}

function signRotatedRefreshToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      sid: sessionId,
      type: "refresh",
      jti: randomBytes(16).toString("base64url"),
    },
    env.jwtSecret,
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
  );
}

function userHotelId(user) {
  return user.hotel?._id || user.hotel || null;
}

export async function createAuthSession(user) {
  const sessionId = randomBytes(32).toString("base64url");
  const refreshToken = signRefreshToken(user, sessionId);
  const now = new Date();
  await RefreshSession.create({
    userId: user._id,
    sessionId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    userType: user.role,
    hotelId: userHotelId(user),
    expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    lastUsedAt: now,
  });

  return {
    sessionId,
    accessToken: signAccessToken(user, sessionId),
    refreshToken,
  };
}

export async function rotateAuthSession(session, user, presentedToken) {
  const now = new Date();
  const refreshToken = signRotatedRefreshToken(user, session.sessionId);
  const tokenHash = hashRefreshToken(presentedToken);
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const rotated = await RefreshSession.findOneAndUpdate(
    {
      _id: session._id,
      refreshTokenHash: tokenHash,
      revoked: false,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        refreshTokenHash: hashRefreshToken(refreshToken),
        userType: user.role,
        hotelId: userHotelId(user),
        expiresAt,
        lastUsedAt: now,
      },
    },
    { new: true },
  );

  if (!rotated) {
    const current = await RefreshSession.findById(session._id).lean();
    if (
      current &&
      !current.revoked &&
      current.expiresAt > now &&
      current.refreshTokenHash !== tokenHash
    ) {
      await RefreshSession.updateOne(
        { _id: current._id, revoked: false },
        { $set: { revoked: true } },
      );
    }
    return null;
  }

  return {
    sessionId: session.sessionId,
    accessToken: signAccessToken(user, session.sessionId),
    refreshToken,
  };
}

export function isValidSessionUser(user, session) {
  if (!user || !user.active || user.role !== session.userType) return null;

  const hotelId = userHotelId(user);
  const matchesHotel = String(hotelId || "") === String(session.hotelId || "");
  if (!matchesHotel) return null;
  if (user.role !== "super_admin" && (!user.hotel || user.hotel.status === "suspended"))
    return null;

  return user;
}

export async function loadSessionUser(session, userId = session.userId) {
  const user = await User.findById(userId).populate("hotel");
  return isValidSessionUser(user, session);
}

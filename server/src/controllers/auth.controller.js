import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Hotel from "../models/Hotel.js";
import RefreshSession from "../models/RefreshSession.js";
import { env } from "../config/env.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  createAuthSession,
  loadSessionUser,
  rotateAuthSession,
} from "../services/authSessionService.js";
import {
  isPasswordResetEmailConfigured,
  resetPassword as completePasswordReset,
  sendPasswordReset,
} from "../services/passwordResetService.js";
import { isValidPhone } from "../utils/phone.js";
import {
  normalizeGmailAddress,
  passwordValidationError,
} from "../utils/accountValidation.js";
import { permissionsForUser } from "../config/permissions.js";

const ACCESS_COOKIE = "aqvreno_token";
const REFRESH_COOKIE = "aqvreno_refresh";
const LEGACY_ACCESS_COOKIE = "staypro_token";

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  maxAge,
  path: "/",
});

function setAuthCookies(res, tokens) {
  res.cookie(
    ACCESS_COOKIE,
    tokens.accessToken,
    cookieOptions(ACCESS_TOKEN_TTL_SECONDS * 1000),
  );
  res.cookie(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions(REFRESH_TOKEN_TTL_SECONDS * 1000),
  );
  res.clearCookie(LEGACY_ACCESS_COOKIE, cookieOptions());
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, cookieOptions());
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  res.clearCookie(LEGACY_ACCESS_COOKIE, cookieOptions());
}

const safe = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: permissionsForUser(user),
  hotel: user.hotel
    ? { id: user.hotel._id, name: user.hotel.name, status: user.hotel.status }
    : null,
});

export async function register(req, res) {
  const {
    name,
    email,
    password,
    hotelName,
    address,
    phone,
    phoneCountryCode = "+91",
    city,
    gstin,
  } = req.body || {};
  const normalizedEmail = normalizeGmailAddress(email);
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password ||
    typeof hotelName !== "string" ||
    !hotelName.trim() ||
    typeof address !== "string" ||
    !address.trim()
  )
    return res
      .status(400)
      .json({
        message: "Name, email, password, hotel name and hotel address are required",
      });
  if (!normalizedEmail)
    return res.status(400).json({
      message: "Use a valid Gmail address ending in @gmail.com",
    });
  const passwordError = passwordValidationError(password);
  if (passwordError) return res.status(400).json({ message: passwordError });
  if (!isValidPhone(phone, phoneCountryCode))
    return res.status(400).json({
      message: "Enter a valid country code and a 10-digit phone number",
    });
  if (await User.findOne({ email: normalizedEmail }))
    return res.status(409).json({ message: "Email already registered" });
  const hotel = await Hotel.create({
    name: hotelName,
    address: address.trim(),
    phone,
    phoneCountryCode,
    city,
    email: normalizedEmail,
    gstin: typeof gstin === "string" ? gstin.trim().toUpperCase() : "",
  });
  let user;
  try {
    user = await User.create({
      name,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      hotel: hotel._id,
      role: "hotel_owner",
    });
    user.hotel = hotel;
    const tokens = await createAuthSession(user);
    setAuthCookies(res, tokens);
    res.status(201).json({
      user: safe(user),
      message: "Registration complete. Your hotel is pending approval.",
    });
  } catch (error) {
    if (user) await User.findByIdAndDelete(user._id);
    await Hotel.findByIdAndDelete(hotel._id);
    throw error;
  }
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const user = await User.findOne({ email: normalizedEmail })
    .select("+password")
    .populate("hotel");
  if (
    typeof password !== "string" ||
    !user ||
    !(await bcrypt.compare(password, user.password))
  )
    return res.status(401).json({ message: "Invalid email or password" });
  if (!user.active)
    return res.status(403).json({ message: "Account disabled" });
  if (
    user.role !== "super_admin" &&
    (!user.hotel || user.hotel.status === "suspended")
  )
    return res.status(403).json({ message: "Hotel access is unavailable" });
  const tokens = await createAuthSession(user);
  setAuthCookies(res, tokens);
  res.json({ user: safe(user) });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string"
  )
    return res
      .status(400)
      .json({ message: "Current password and new password are required" });

  const passwordError = passwordValidationError(newPassword);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const user = await User.findById(req.user._id).select("+password");
  if (!user || !(await bcrypt.compare(currentPassword, user.password)))
    return res.status(400).json({ message: "Current password is incorrect" });
  if (await bcrypt.compare(newPassword, user.password))
    return res
      .status(400)
      .json({ message: "New password must be different from current password" });

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  await RefreshSession.updateMany(
    {
      userId: user._id,
      sessionId: { $ne: req.authSession.sessionId },
      revoked: false,
    },
    { $set: { revoked: true } },
  );
  return res.json({
    message: "Password changed. Other active sessions have been signed out.",
  });
}

export async function forgotPassword(req, res) {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ message: "Enter a valid email address" });
  if (!isPasswordResetEmailConfigured())
    return res
      .status(503)
      .json({ message: "Password recovery email is not configured" });

  const user = await User.findOne({ email }).select("_id email");
  if (user) {
    try {
      await sendPasswordReset(user);
    } catch (error) {
      console.error("Password reset email delivery failed:", error);
    }
  }
  return res.status(202).json({
    message:
      "If an account exists for that email, password reset instructions will be sent.",
  });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    return res.status(400).json({ message: "Reset link is invalid or expired" });
  if (typeof password !== "string")
    return res.status(400).json({ message: "A new password is required" });
  const passwordError = passwordValidationError(password);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const reset = await completePasswordReset(token, password);
  if (!reset)
    return res.status(400).json({ message: "Reset link is invalid or expired" });
  clearAuthCookies(res);
  return res.json({
    message: "Password reset complete. Sign in with your new password.",
  });
}

export async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Refresh token required" });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Session expired or invalid" });
  }
  if (
    payload.type !== "refresh" ||
    typeof payload.sid !== "string" ||
    typeof payload.sub !== "string"
  ) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Session expired or invalid" });
  }

  const session = await RefreshSession.findOne({
    sessionId: payload.sid,
    userId: payload.sub,
  });
  if (!session || session.revoked || session.expiresAt <= new Date()) {
    if (session && !session.revoked)
      await RefreshSession.updateOne(
        { _id: session._id, revoked: false },
        { $set: { revoked: true } },
      );
    clearAuthCookies(res);
    return res.status(401).json({ message: "Session expired or revoked" });
  }

  const user = await loadSessionUser(session, payload.sub);
  if (!user) {
    await RefreshSession.updateOne(
      { _id: session._id, revoked: false },
      { $set: { revoked: true } },
    );
    clearAuthCookies(res);
    return res.status(401).json({ message: "Account or hotel access is unavailable" });
  }

  const tokens = await rotateAuthSession(session, user, token);
  if (!tokens) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Refresh token reuse detected" });
  }
  setAuthCookies(res, tokens);
  return res.json({ message: "Session refreshed" });
}

export async function logout(req, res) {
  await RefreshSession.updateOne(
    { _id: req.authSession._id, userId: req.user._id },
    { $set: { revoked: true } },
  );
  clearAuthCookies(res);
  res.json({ message: "Logged out" });
}

export async function logoutAll(req, res) {
  await RefreshSession.updateMany(
    { userId: req.user._id, revoked: false },
    { $set: { revoked: true } },
  );
  clearAuthCookies(res);
  res.json({ message: "Logged out from all sessions" });
}

export async function listSessions(req, res) {
  const sessions = await RefreshSession.find({
    userId: req.user._id,
    revoked: false,
    expiresAt: { $gt: new Date() },
  })
    .select("sessionId userType hotelId expiresAt createdAt lastUsedAt")
    .sort({ lastUsedAt: -1 })
    .lean();
  res.json({ sessions, currentSessionId: req.authSession.sessionId });
}

export async function revokeSession(req, res) {
  const { sessionId } = req.params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(sessionId))
    return res.status(400).json({ message: "Invalid session ID" });

  const result = await RefreshSession.updateOne(
    { sessionId, userId: req.user._id, revoked: false },
    { $set: { revoked: true } },
  );
  if (!result.matchedCount)
    return res.status(404).json({ message: "Active session not found" });
  if (sessionId === req.authSession.sessionId) clearAuthCookies(res);
  return res.json({ message: "Session revoked" });
}

export function me(req, res) {
  res.json({ user: safe(req.user) });
}

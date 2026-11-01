import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import RefreshSession from "../models/RefreshSession.js";
import User from "../models/User.js";
import { sendEmail } from "./emailService.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendPasswordReset(user, send = sendEmail) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  const tokenHash = hashToken(token);
  await PasswordResetToken.findOneAndUpdate(
    { userId: user._id },
    { $set: { tokenHash, expiresAt } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const clientOrigin = new URL(env.clientUrl.split(",")[0].trim()).origin;
  const resetUrl = new URL("/reset-password", clientOrigin);
  resetUrl.hash = new URLSearchParams({ token }).toString();
  try {
    await send({
      to: user.email,
      subject: "Reset your AQVRENO password",
      text: `A password reset was requested for your AQVRENO account. Open this one-time link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    });
  } catch (error) {
    await PasswordResetToken.deleteOne({ userId: user._id, tokenHash });
    throw error;
  }
}

export async function resetPassword(token, password) {
  const resetToken = await PasswordResetToken.findOneAndDelete({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!resetToken) return false;

  await RefreshSession.updateMany(
    { userId: resetToken.userId, revoked: false },
    { $set: { revoked: true } },
  );
  const result = await User.updateOne(
    { _id: resetToken.userId },
    { $set: { password: await bcrypt.hash(password, 12) } },
  );
  return result.matchedCount === 1;
}

export function isPasswordResetEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

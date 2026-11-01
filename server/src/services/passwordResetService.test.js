import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, test } from "node:test";
import bcrypt from "bcryptjs";
import PasswordResetToken from "../models/PasswordResetToken.js";
import RefreshSession from "../models/RefreshSession.js";
import User from "../models/User.js";
import {
  resetPassword,
  sendPasswordReset,
} from "./passwordResetService.js";

const originalMethods = new Map();
const patched = (target, method, replacement) => {
  const key = `${target.modelName}.${method}`;
  if (!originalMethods.has(key))
    originalMethods.set(key, [target, method, target[method]]);
  target[method] = replacement;
};

after(() => {
  for (const [target, method, original] of originalMethods.values())
    target[method] = original;
});

test("sends a one-time email link, hashes its token, changes password and revokes sessions", async () => {
  const tokens = new Map();
  const user = { _id: "65f000000000000000000001", email: "owner@example.test" };
  let storedPassword;
  let revoked = false;
  let sentEmail;

  patched(PasswordResetToken, "findOneAndUpdate", async ({ userId }, update) => {
    for (const [hash, entry] of tokens)
      if (entry.userId === userId) tokens.delete(hash);
    const entry = { userId, ...update.$set };
    tokens.set(entry.tokenHash, entry);
    return entry;
  });
  patched(PasswordResetToken, "deleteOne", async ({ userId, tokenHash }) => {
    const entry = tokens.get(tokenHash);
    if (entry?.userId === userId) tokens.delete(tokenHash);
  });
  patched(PasswordResetToken, "findOneAndDelete", async ({ tokenHash, expiresAt }) => {
    const entry = tokens.get(tokenHash);
    if (!entry || entry.expiresAt <= expiresAt.$gt) return null;
    tokens.delete(tokenHash);
    return entry;
  });
  patched(RefreshSession, "updateMany", async () => {
    revoked = true;
    return { acknowledged: true };
  });
  patched(User, "updateOne", async (_filter, update) => {
    storedPassword = update.$set.password;
    return { matchedCount: 1 };
  });

  await sendPasswordReset(user, async (email) => {
    sentEmail = email;
  });
  assert.equal(sentEmail.to, user.email);
  const url = new URL(sentEmail.text.match(/https?:\/\/\S+/)[0]);
  assert.equal(url.pathname, "/reset-password");
  const rawToken = new URLSearchParams(url.hash.slice(1)).get("token");
  assert.equal(rawToken.length, 43);
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  assert.equal(tokens.size, 1);
  assert.equal(tokens.has(tokenHash), true);
  assert.equal(tokens.has(rawToken), false);

  assert.equal(await resetPassword(rawToken, "NewPassword@123"), true);
  assert.equal(tokens.size, 0);
  assert.equal(revoked, true);
  assert.equal(
    await bcrypt.compare("NewPassword@123", storedPassword),
    true,
  );
  assert.equal(await resetPassword(rawToken, "AnotherPassword@123"), false);
});

test("removes a reset token when email delivery fails", async () => {
  const tokens = new Map();
  patched(PasswordResetToken, "findOneAndUpdate", async ({ userId }, update) => {
    const entry = { userId, ...update.$set };
    tokens.set(entry.tokenHash, entry);
    return entry;
  });
  patched(PasswordResetToken, "deleteOne", async ({ userId, tokenHash }) => {
    const entry = tokens.get(tokenHash);
    if (entry?.userId === userId) tokens.delete(tokenHash);
  });

  await assert.rejects(
    sendPasswordReset(
      { _id: "65f000000000000000000002", email: "owner@example.test" },
      async () => {
        throw new Error("mail provider unavailable");
      },
    ),
    /mail provider unavailable/,
  );
  assert.equal(tokens.size, 0);
});

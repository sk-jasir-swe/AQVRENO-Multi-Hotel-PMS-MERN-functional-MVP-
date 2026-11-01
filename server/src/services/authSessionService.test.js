import assert from "node:assert/strict";
import { after, test } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import RefreshSession from "../models/RefreshSession.js";
import User from "../models/User.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  createAuthSession,
  hashRefreshToken,
  loadSessionUser,
} from "./authSessionService.js";
import {
  changePassword,
  listSessions,
  login,
  logout,
  logoutAll,
  refresh,
  revokeSession,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";

const originalMethods = new Map();
const patched = (target, method, replacement) => {
  if (!originalMethods.has(`${target.modelName}.${method}`))
    originalMethods.set(`${target.modelName}.${method}`, [target, method, target[method]]);
  target[method] = replacement;
};

after(() => {
  for (const [target, method, original] of originalMethods.values())
    target[method] = original;
});

function response() {
  return {
    statusCode: 200,
    cookies: {},
    clearedCookies: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name) {
      this.clearedCookies.push(name);
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("login, access validation, refresh rotation, reuse detection and revocation", async () => {
  const password = "test-password";
  const user = {
    _id: "65f000000000000000000001",
    name: "Test Owner",
    email: "owner@example.test",
    password: await bcrypt.hash(password, 4),
    role: "hotel_owner",
    active: true,
    save: async () => {},
    hotel: {
      _id: "65f000000000000000000002",
      name: "Test Hotel",
      status: "approved",
    },
  };
  const sessions = new Map();

  patched(User, "findOne", () => ({
    select() {
      return this;
    },
    populate: async () => user,
  }));
  patched(User, "findById", () => ({
    select: async () => user,
    populate: async () => user,
  }));
  patched(RefreshSession, "create", async (document) => {
    const stored = {
      ...document,
      _id: `session-${sessions.size + 1}`,
      revoked: false,
      createdAt: new Date(),
    };
    sessions.set(stored.sessionId, stored);
    return stored;
  });
  patched(RefreshSession, "findOne", async ({ sessionId, userId }) => {
    const session = sessions.get(sessionId);
    return session?.userId === userId ? session : null;
  });
  patched(RefreshSession, "findOneAndUpdate", async (filter, update) => {
    const session = [...sessions.values()].find(
      (candidate) =>
        candidate._id === filter._id &&
        candidate.refreshTokenHash === filter.refreshTokenHash &&
        !candidate.revoked &&
        candidate.expiresAt > filter.expiresAt.$gt,
    );
    if (!session) return null;
    Object.assign(session, update.$set);
    return session;
  });
  patched(RefreshSession, "findById", (id) => ({
    lean: async () => [...sessions.values()].find((session) => session._id === id),
  }));
  patched(RefreshSession, "updateOne", async (filter, update) => {
    const session = [...sessions.values()].find(
      (candidate) =>
        (filter._id ? candidate._id === filter._id : true) &&
        (filter.userId ? candidate.userId === filter.userId : true) &&
        (filter.sessionId ? candidate.sessionId === filter.sessionId : true) &&
        (filter.revoked === false ? !candidate.revoked : true),
    );
    if (!session) return { matchedCount: 0 };
    Object.assign(session, update.$set);
    return { matchedCount: 1 };
  });
  patched(RefreshSession, "updateMany", async (filter, update) => {
    for (const session of sessions.values())
      if (
        session.userId === filter.userId &&
        (!filter.revoked || !session.revoked) &&
        (!filter.sessionId?.$ne ||
          session.sessionId !== filter.sessionId.$ne)
      )
        Object.assign(session, update.$set);
    return { acknowledged: true };
  });
  patched(RefreshSession, "find", () => ({
    select() {
      return this;
    },
    sort() {
      return this;
    },
    lean: async () =>
      [...sessions.values()].filter((session) => !session.revoked),
  }));

  const loginResponse = response();
  await login({ body: { email: user.email, password } }, loginResponse);
  assert.equal(loginResponse.statusCode, 200);
  assert.equal(loginResponse.body.user.id, user._id);
  const accessToken = loginResponse.cookies.aqvreno_token.value;
  const oldRefreshToken = loginResponse.cookies.aqvreno_refresh.value;
  assert.equal(loginResponse.cookies.aqvreno_token.options.httpOnly, true);
  assert.equal(loginResponse.cookies.aqvreno_token.options.secure, false);
  assert.equal(loginResponse.cookies.aqvreno_token.options.sameSite, "lax");
  assert.equal(
    loginResponse.cookies.aqvreno_token.options.maxAge,
    ACCESS_TOKEN_TTL_SECONDS * 1000,
  );
  assert.equal(
    loginResponse.cookies.aqvreno_refresh.options.maxAge,
    7 * 24 * 60 * 60 * 1000,
  );
  const payload = jwt.decode(accessToken);
  const refreshPayload = jwt.decode(oldRefreshToken);
  assert.equal(payload.type, "access");
  assert.ok(payload.exp - payload.iat <= ACCESS_TOKEN_TTL_SECONDS);
  assert.ok(payload.sid);
  assert.equal(refreshPayload.type, "refresh");
  assert.ok(refreshPayload.exp - refreshPayload.iat <= 7 * 24 * 60 * 60);
  assert.equal(payload.sid.length, 43);

  let nextCalled = false;
  const protectedRequest = {
    cookies: { aqvreno_token: accessToken },
    headers: {},
  };
  await protect(protectedRequest, response(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(protectedRequest.user._id, user._id);
  assert.equal(protectedRequest.authSession.sessionId, payload.sid);
  assert.equal(String(protectedRequest.tenantId), String(user.hotel._id));

  const session = sessions.get(payload.sid);
  assert.equal(session.userId, user._id);
  assert.equal(session.userType, user.role);
  assert.equal(session.hotelId, user.hotel._id);
  assert.equal(Object.hasOwn(session, "refreshToken"), false);
  assert.equal(session.refreshTokenHash, hashRefreshToken(oldRefreshToken));
  assert.notEqual(session.refreshTokenHash, oldRefreshToken);
  user.active = false;
  assert.equal(await loadSessionUser(session), null);
  user.active = true;
  user.hotel.status = "suspended";
  assert.equal(await loadSessionUser(session), null);
  user.hotel.status = "approved";
  assert.equal(await loadSessionUser({ ...session, hotelId: "other-hotel" }), null);

  const refreshResponse = response();
  await refresh(
    { cookies: { aqvreno_refresh: oldRefreshToken } },
    refreshResponse,
  );
  const rotatedToken = refreshResponse.cookies.aqvreno_refresh.value;
  assert.equal(refreshResponse.statusCode, 200);
  assert.notEqual(rotatedToken, oldRefreshToken);
  assert.equal(session.refreshTokenHash, hashRefreshToken(rotatedToken));

  const replayResponse = response();
  await refresh(
    { cookies: { aqvreno_refresh: oldRefreshToken } },
    replayResponse,
  );
  assert.equal(replayResponse.statusCode, 401);
  assert.equal(session.revoked, true);

  const anotherSession = await createAuthSession(user);
  const sessionsResponse = response();
  await listSessions(
    {
      user,
      authSession: { sessionId: anotherSession.sessionId },
    },
    sessionsResponse,
  );
  assert.equal(sessionsResponse.body.sessions.length, 1);
  assert.equal(sessionsResponse.body.currentSessionId, anotherSession.sessionId);

  const revokeResponse = response();
  await revokeSession(
    {
      params: { sessionId: anotherSession.sessionId },
      user,
      authSession: { sessionId: "another-active-session" },
    },
    revokeResponse,
  );
  assert.equal(revokeResponse.statusCode, 200);
  assert.equal(sessions.get(anotherSession.sessionId).revoked, true);

  const passwordSession = await createAuthSession(user);
  const changePasswordResponse = response();
  await changePassword(
    {
      body: { currentPassword: password, newPassword: "UpdatedPassword@123" },
      user,
      authSession: { sessionId: passwordSession.sessionId },
    },
    changePasswordResponse,
  );
  assert.equal(changePasswordResponse.statusCode, 200);
  assert.equal(
    await bcrypt.compare("UpdatedPassword@123", user.password),
    true,
  );
  assert.equal(sessions.get(passwordSession.sessionId).revoked, false);

  const wrongPasswordResponse = response();
  await changePassword(
    {
      body: {
        currentPassword: password,
        newPassword: "AnotherPassword@123",
      },
      user,
      authSession: { sessionId: passwordSession.sessionId },
    },
    wrongPasswordResponse,
  );
  assert.equal(wrongPasswordResponse.statusCode, 400);
  assert.equal(
    wrongPasswordResponse.body.message,
    "Current password is incorrect",
  );

  const logoutSession = await createAuthSession(user);
  const logoutResponse = response();
  await logout(
    {
      user,
      authSession: { _id: sessions.get(logoutSession.sessionId)._id },
    },
    logoutResponse,
  );
  assert.equal(sessions.get(logoutSession.sessionId).revoked, true);

  const finalSession = await createAuthSession(user);
  const logoutAllResponse = response();
  await logoutAll({ user }, logoutAllResponse);
  assert.equal(sessions.get(finalSession.sessionId).revoked, true);
  assert.equal(logoutAllResponse.statusCode, 200);
});

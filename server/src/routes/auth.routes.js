import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  logoutAll,
  listSessions,
  revokeSession,
  me,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many sign-in attempts. Try again later." },
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many refresh attempts. Try again later." },
});
const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password recovery attempts. Try again later." },
});
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset attempts. Try again later." },
});
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password change attempts. Try again later." },
});

router.post("/auth/register", asyncHandler(register));
router.post("/auth/login", loginLimiter, asyncHandler(login));
router.post(
  "/auth/change-password",
  protect,
  changePasswordLimiter,
  asyncHandler(changePassword),
);
router.post(
  "/auth/forgot-password",
  passwordRecoveryLimiter,
  asyncHandler(forgotPassword),
);
router.post(
  "/auth/reset-password",
  passwordResetLimiter,
  asyncHandler(resetPassword),
);
router.post("/auth/refresh", refreshLimiter, asyncHandler(refresh));
router.post("/auth/logout", protect, asyncHandler(logout));
router.post("/auth/logout-all", protect, asyncHandler(logoutAll));
router.get("/auth/sessions", protect, asyncHandler(listSessions));
router.delete("/auth/sessions/:sessionId", protect, asyncHandler(revokeSession));
router.get("/auth/me", protect, asyncHandler(me));
export default router;

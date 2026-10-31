import { Router } from "express";
import {
  notificationsList,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { protect, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
router.get(
  "/notifications",
  protect,
  requireApprovedHotel,
  asyncHandler(notificationsList),
);
router.patch(
  "/notifications/:id/read",
  protect,
  requireApprovedHotel,
  asyncHandler(markNotificationRead),
);

export default router;

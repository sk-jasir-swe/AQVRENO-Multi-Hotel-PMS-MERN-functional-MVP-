import { Router } from "express";
import {
  dailyClose,
  updateDailyCloseChecklist,
} from "../controllers/dailyClose.controller.js";
import {
  protect,
  requireApprovedHotel,
  requirePermission,
} from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();

router.get(
  "/daily-close",
  protect,
  requireApprovedHotel,
  requirePermission("frontdesk.view"),
  asyncHandler(dailyClose),
);
router.patch(
  "/daily-close",
  protect,
  requireApprovedHotel,
  requirePermission("frontdesk.view"),
  asyncHandler(updateDailyCloseChecklist),
);

export default router;

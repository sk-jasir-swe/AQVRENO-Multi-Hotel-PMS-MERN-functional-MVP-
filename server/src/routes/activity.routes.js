import { Router } from "express";
import { listActivity } from "../controllers/activity.controller.js";
import { allowRoles, protect, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
router.get(
  "/activity",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner"),
  asyncHandler(listActivity),
);
export default router;

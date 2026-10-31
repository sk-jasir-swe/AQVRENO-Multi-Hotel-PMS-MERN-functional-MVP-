import { Router } from "express";
import {
  listPlans,
  currentSubscription,
  requestSubscription,
} from "../controllers/subscription.controller.js";
import { protect, allowRoles, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
router.get(
  "/plans",
  protect,
  requireApprovedHotel,
  asyncHandler(listPlans),
);
router.get(
  "/subscription",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner"),
  asyncHandler(currentSubscription),
);
router.post(
  "/subscription",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner"),
  asyncHandler(requestSubscription),
);

export default router;

import { Router } from "express";
import {
  housekeepingList,
  createHousekeeping,
  updateHousekeeping,
} from "../controllers/housekeeping.controller.js";
import { protect, allowRoles, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
const roles = allowRoles("hotel_owner", "hotel_manager", "housekeeping");
router.get(
  "/housekeeping",
  protect,
  requireApprovedHotel,
  roles,
  asyncHandler(housekeepingList),
);
router.post(
  "/housekeeping",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(createHousekeeping),
);
router.patch(
  "/housekeeping/:id",
  protect,
  requireApprovedHotel,
  roles,
  asyncHandler(updateHousekeeping),
);
export default router;

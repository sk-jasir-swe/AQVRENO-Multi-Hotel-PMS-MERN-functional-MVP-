import { Router } from "express";
import {
  createStaff,
  listStaff,
  updateStaff,
  updateStaffPermissions,
} from "../controllers/staff.controller.js";
import { protect, allowRoles, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
router.get(
  "/staff",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(listStaff),
);
router.post(
  "/staff",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner"),
  asyncHandler(createStaff),
);
router.patch(
  "/staff/:id",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner"),
  asyncHandler(updateStaff),
);
router.patch(
  "/staff/:id/permissions",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(updateStaffPermissions),
);
export default router;

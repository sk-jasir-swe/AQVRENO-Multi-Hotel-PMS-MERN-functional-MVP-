import { Router } from "express";
import {
  hotelSettings,
  updateHotelSettings,
} from "../controllers/hotel.controller.js";
import { protect, allowRoles, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
router.get(
  "/hotel/settings",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(hotelSettings),
);
router.patch(
  "/hotel/settings",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner"),
  asyncHandler(updateHotelSettings),
);
export default router;

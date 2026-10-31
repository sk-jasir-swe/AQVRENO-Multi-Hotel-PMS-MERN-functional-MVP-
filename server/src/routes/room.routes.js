import { Router } from "express";
import {
  list,
  create,
  update,
  remove,
} from "../controllers/room.controller.js";
import { protect, allowRoles, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
const readRoles = allowRoles(
  "hotel_owner",
  "hotel_manager",
  "receptionist",
  "housekeeping",
);
router.get(
  "/rooms",
  protect,
  requireApprovedHotel,
  readRoles,
  asyncHandler(list),
);
router.post(
  "/rooms",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager", "receptionist"),
  asyncHandler(create),
);
router.patch(
  "/rooms/:id",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(update),
);
router.delete(
  "/rooms/:id",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(remove),
);
export default router;

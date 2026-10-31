import { Router } from "express";
import {
  adjustInventory,
  createInventoryItem,
  listInventory,
} from "../controllers/inventory.controller.js";
import { allowRoles, protect, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
const roles = allowRoles(
  "hotel_owner",
  "hotel_manager",
  "restaurant_staff",
  "housekeeping",
);
router.get(
  "/inventory",
  protect,
  requireApprovedHotel,
  roles,
  asyncHandler(listInventory),
);
router.post(
  "/inventory",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(createInventoryItem),
);
router.patch(
  "/inventory/:id/adjust",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(adjustInventory),
);
export default router;

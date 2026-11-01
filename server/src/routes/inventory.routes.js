import { Router } from "express";
import {
  adjustInventory,
  createInventoryItem,
  listInventory,
} from "../controllers/inventory.controller.js";
import {
  protect,
  requirePermission,
  requireApprovedHotel,
} from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
router.get(
  "/inventory",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.inventory.view"),
  asyncHandler(listInventory),
);
router.post(
  "/inventory",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.inventory.manage"),
  asyncHandler(createInventoryItem),
);
router.patch(
  "/inventory/:id/adjust",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.inventory.manage"),
  asyncHandler(adjustInventory),
);
export default router;

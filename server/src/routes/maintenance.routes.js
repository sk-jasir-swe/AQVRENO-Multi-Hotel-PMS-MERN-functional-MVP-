import { Router } from "express";
import {
  cancelMaintenanceBlock,
  createMaintenanceBlock,
  listMaintenanceBlocks,
} from "../controllers/maintenance.controller.js";
import { allowRoles, protect, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
router.get(
  "/maintenance",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(listMaintenanceBlocks),
);
router.post(
  "/maintenance",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(createMaintenanceBlock),
);
router.patch(
  "/maintenance/:id/cancel",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(cancelMaintenanceBlock),
);

export default router;

import { Router } from "express";
import {
  backupHotelData,
  exportRecords,
  previewHotelRestore,
  restoreHotelData,
} from "../controllers/export.controller.js";
import { protect, allowRoles, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
router.post(
  "/exports/restore/preview",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner"),
  asyncHandler(previewHotelRestore),
);
router.post(
  "/exports/restore",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner"),
  asyncHandler(restoreHotelData),
);
router.get(
  "/exports/backup",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner"),
  asyncHandler(backupHotelData),
);
router.get(
  "/exports/:kind",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(exportRecords),
);

export default router;

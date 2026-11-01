import { Router } from "express";
import {
  housekeepingList,
  createHousekeeping,
  updateHousekeeping,
} from "../controllers/housekeeping.controller.js";
import {
  protect,
  requirePermission,
  requireApprovedHotel,
} from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
router.get(
  "/housekeeping",
  protect,
  requireApprovedHotel,
  requirePermission("housekeeping.view"),
  asyncHandler(housekeepingList),
);
router.post(
  "/housekeeping",
  protect,
  requireApprovedHotel,
  requirePermission("housekeeping.manage"),
  asyncHandler(createHousekeeping),
);
router.patch(
  "/housekeeping/:id",
  protect,
  requireApprovedHotel,
  requirePermission("housekeeping.manage"),
  asyncHandler(updateHousekeeping),
);
export default router;

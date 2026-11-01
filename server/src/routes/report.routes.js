import { Router } from "express";
import { reports } from "../controllers/report.controller.js";
import { protect, requirePermission, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
router.get(
  "/reports",
  protect,
  requireApprovedHotel,
  requirePermission("reports.view"),
  asyncHandler(reports),
);
export default router;

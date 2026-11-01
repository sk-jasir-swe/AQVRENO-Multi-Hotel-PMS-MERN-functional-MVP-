import { Router } from "express";
import {
  guestHistory,
  list,
  create,
  update,
  remove,
} from "../controllers/guest.controller.js";
import {
  protect,
  requirePermission,
  requireApprovedHotel,
} from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
router.get(
  "/guests/:id/history",
  protect,
  requireApprovedHotel,
  requirePermission("guests.view"),
  asyncHandler(guestHistory),
);
router.get(
  "/guests",
  protect,
  requireApprovedHotel,
  requirePermission("guests.view"),
  asyncHandler(list),
);
router.post(
  "/guests",
  protect,
  requireApprovedHotel,
  requirePermission("guests.create"),
  asyncHandler(create),
);
router.patch(
  "/guests/:id",
  protect,
  requireApprovedHotel,
  requirePermission("guests.update"),
  asyncHandler(update),
);
router.delete(
  "/guests/:id",
  protect,
  requireApprovedHotel,
  requirePermission("guests.delete"),
  asyncHandler(remove),
);
export default router;

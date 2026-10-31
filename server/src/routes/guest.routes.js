import { Router } from "express";
import {
  guestHistory,
  list,
  create,
  update,
  remove,
} from "../controllers/guest.controller.js";
import { protect, allowRoles, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
const guestRoles = allowRoles("hotel_owner", "hotel_manager", "receptionist");
router.get(
  "/guests/:id/history",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager", "receptionist"),
  asyncHandler(guestHistory),
);
router.get(
  "/guests",
  protect,
  requireApprovedHotel,
  guestRoles,
  asyncHandler(list),
);
router.post(
  "/guests",
  protect,
  requireApprovedHotel,
  guestRoles,
  asyncHandler(create),
);
router.patch(
  "/guests/:id",
  protect,
  requireApprovedHotel,
  guestRoles,
  asyncHandler(update),
);
router.delete(
  "/guests/:id",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(remove),
);
export default router;

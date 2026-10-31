import { Router } from "express";
import {
  calendar,
  frontDesk,
  createInvoice,
  list,
  create,
  update,
  remove,
  dashboard,
} from "../controllers/booking.controller.js";
import {
  protect,
  allowRoles,
  requireApprovedHotel,
} from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
const frontDeskRoles = allowRoles(
  "hotel_owner",
  "hotel_manager",
  "receptionist",
);
router.get(
  "/dashboard",
  protect,
  requireApprovedHotel,
  frontDeskRoles,
  asyncHandler(dashboard),
);
router.get(
  "/calendar",
  protect,
  requireApprovedHotel,
  frontDeskRoles,
  asyncHandler(calendar),
);
router.get(
  "/front-desk",
  protect,
  requireApprovedHotel,
  frontDeskRoles,
  asyncHandler(frontDesk),
);
router.post(
  "/bookings/:bookingId/invoice",
  protect,
  requireApprovedHotel,
  frontDeskRoles,
  asyncHandler(createInvoice),
);
const bookingRoles = allowRoles("hotel_owner", "hotel_manager", "receptionist");
router.get(
  "/bookings",
  protect,
  requireApprovedHotel,
  bookingRoles,
  asyncHandler(list),
);
router.post(
  "/bookings",
  protect,
  requireApprovedHotel,
  bookingRoles,
  asyncHandler(create),
);
router.patch(
  "/bookings/:id",
  protect,
  requireApprovedHotel,
  bookingRoles,
  asyncHandler(update),
);
router.delete(
  "/bookings/:id",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(remove),
);
export default router;

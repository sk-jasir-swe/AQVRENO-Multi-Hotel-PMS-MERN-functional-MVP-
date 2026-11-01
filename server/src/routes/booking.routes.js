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
  history,
} from "../controllers/booking.controller.js";
import {
  protect,
  allowRoles,
  requirePermission,
  requireApprovedHotel,
} from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
router.get(
  "/dashboard",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(dashboard),
);
router.get(
  "/calendar",
  protect,
  requireApprovedHotel,
  requirePermission("calendar.view"),
  asyncHandler(calendar),
);
router.get(
  "/front-desk",
  protect,
  requireApprovedHotel,
  requirePermission("frontdesk.view"),
  asyncHandler(frontDesk),
);
router.post(
  "/bookings/:bookingId/invoice",
  protect,
  requireApprovedHotel,
  requirePermission("bookings.view"),
  asyncHandler(createInvoice),
);
router.get(
  "/bookings",
  protect,
  requireApprovedHotel,
  requirePermission(["bookings.view", "payments.record"]),
  asyncHandler(list),
);
router.get(
  "/bookings/:id/history",
  protect,
  requireApprovedHotel,
  requirePermission("bookings.view"),
  asyncHandler(history),
);
router.post(
  "/bookings",
  protect,
  requireApprovedHotel,
  requirePermission("bookings.create"),
  asyncHandler(create),
);
router.patch(
  "/bookings/:id",
  protect,
  requireApprovedHotel,
  requirePermission((req) =>
    req.body.status === "cancelled" ? "bookings.cancel" : "bookings.update",
  ),
  asyncHandler(update),
);
router.delete(
  "/bookings/:id",
  protect,
  requireApprovedHotel,
  requirePermission("bookings.delete"),
  asyncHandler(remove),
);
export default router;

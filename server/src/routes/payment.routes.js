import { Router } from "express";
import {
  paymentsList,
  reconciliation,
  recordPayment,
  refundPayment,
} from "../controllers/payment.controller.js";
import { protect, allowRoles, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
const frontDeskRoles = allowRoles(
  "hotel_owner",
  "hotel_manager",
  "receptionist",
);
router.get(
  "/payments",
  protect,
  requireApprovedHotel,
  frontDeskRoles,
  asyncHandler(paymentsList),
);
router.get(
  "/payments/reconciliation",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(reconciliation),
);
router.post(
  "/payments",
  protect,
  requireApprovedHotel,
  frontDeskRoles,
  asyncHandler(recordPayment),
);
router.patch(
  "/payments/:id/refund",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(refundPayment),
);
export default router;

import { Router } from "express";
import {
  paymentsList,
  reconciliation,
  recordPayment,
  refundPayment,
} from "../controllers/payment.controller.js";
import {
  protect,
  requirePermission,
  requireApprovedHotel,
} from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
router.get(
  "/payments",
  protect,
  requireApprovedHotel,
  requirePermission("payments.view"),
  asyncHandler(paymentsList),
);
router.get(
  "/payments/reconciliation",
  protect,
  requireApprovedHotel,
  requirePermission("payments.view"),
  asyncHandler(reconciliation),
);
router.post(
  "/payments",
  protect,
  requireApprovedHotel,
  requirePermission("payments.record"),
  asyncHandler(recordPayment),
);
router.patch(
  "/payments/:id/refund",
  protect,
  requireApprovedHotel,
  requirePermission("payments.refund"),
  asyncHandler(refundPayment),
);
export default router;

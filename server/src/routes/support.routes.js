import { Router } from "express";
import {
  createTicket,
  hotelTicketsList,
  replyToTicket,
  supportTicketsList,
  updateTicketStatus,
} from "../controllers/support.controller.js";
import { allowRoles, protect, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
const superAdminOnly = allowRoles("super_admin");

router.post(
  "/support/tickets",
  protect,
  requirePermission("support.manage"),
  asyncHandler(createTicket),
);
router.get(
  "/support/tickets",
  protect,
  requirePermission("support.manage"),
  asyncHandler(hotelTicketsList),
);
router.post(
  "/support/tickets/:id/replies",
  protect,
  requirePermission("support.manage"),
  asyncHandler(replyToTicket),
);
router.get(
  "/super-admin/support",
  protect,
  superAdminOnly,
  asyncHandler(supportTicketsList),
);
router.patch(
  "/super-admin/support/:id",
  protect,
  superAdminOnly,
  asyncHandler(updateTicketStatus),
);
router.post(
  "/super-admin/support/:id/replies",
  protect,
  superAdminOnly,
  asyncHandler(replyToTicket),
);

export default router;

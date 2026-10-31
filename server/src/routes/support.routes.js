import { Router } from "express";
import {
  createTicket,
  hotelTicketsList,
  replyToTicket,
  supportTicketsList,
  updateTicketStatus,
} from "../controllers/support.controller.js";
import { allowRoles, protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
const hotelRoles = allowRoles(
  "hotel_owner",
  "hotel_manager",
  "receptionist",
  "housekeeping",
  "restaurant_staff",
);
const superAdminOnly = allowRoles("super_admin");

router.post(
  "/support/tickets",
  protect,
  hotelRoles,
  asyncHandler(createTicket),
);
router.get(
  "/support/tickets",
  protect,
  hotelRoles,
  asyncHandler(hotelTicketsList),
);
router.post(
  "/support/tickets/:id/replies",
  protect,
  hotelRoles,
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

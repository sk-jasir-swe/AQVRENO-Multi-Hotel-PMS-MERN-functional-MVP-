import { Router } from "express";
import authRoutes from "./auth.routes.js";
import activityRoutes from "./activity.routes.js";
import bookingRoutes from "./booking.routes.js";
import exportRoutes from "./export.routes.js";
import guestRoutes from "./guest.routes.js";
import housekeepingRoutes from "./housekeeping.routes.js";
import hotelRoutes from "./hotel.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import notificationRoutes from "./notification.routes.js";
import paymentRoutes from "./payment.routes.js";
import reportRoutes from "./report.routes.js";
import restaurantRoutes from "./restaurant.routes.js";
import roomRoutes from "./room.routes.js";
import staffRoutes from "./staff.routes.js";
import subscriptionRoutes from "./subscription.routes.js";
import superAdminRoutes from "./superAdmin.routes.js";
import supportRoutes from "./support.routes.js";

const router = Router();
router.use(
  authRoutes,
  activityRoutes,
  bookingRoutes,
  guestRoutes,
  roomRoutes,
  paymentRoutes,
  hotelRoutes,
  inventoryRoutes,
  restaurantRoutes,
  reportRoutes,
  housekeepingRoutes,
  staffRoutes,
  subscriptionRoutes,
  notificationRoutes,
  exportRoutes,
  superAdminRoutes,
  supportRoutes,
);

export default router;

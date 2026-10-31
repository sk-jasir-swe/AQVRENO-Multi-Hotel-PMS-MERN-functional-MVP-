import { Router } from "express";
import {
  createMenuItem,
  createOrder,
  activeBookingsList,
  listMenu,
  listOrders,
  restaurantIncome,
  restaurantSettings,
  updateRestaurantSettings,
  updateMenuItem,
  updateOrder,
} from "../controllers/restaurant.controller.js";
import { allowRoles, protect, requireApprovedHotel } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
const roles = allowRoles(
  "hotel_owner",
  "hotel_manager",
  "receptionist",
  "restaurant_staff",
  "housekeeping",
);
router.get(
  "/restaurant/settings",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(restaurantSettings),
);
router.patch(
  "/restaurant/settings",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(updateRestaurantSettings),
);
router.get(
  "/restaurant/income",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(restaurantIncome),
);
router.get(
  "/restaurant/menu",
  protect,
  requireApprovedHotel,
  roles,
  asyncHandler(listMenu),
);
router.post(
  "/restaurant/menu",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(createMenuItem),
);
router.patch(
  "/restaurant/menu/:id",
  protect,
  requireApprovedHotel,
  allowRoles("hotel_owner", "hotel_manager"),
  asyncHandler(updateMenuItem),
);
router.get(
  "/restaurant/active-bookings",
  protect,
  requireApprovedHotel,
  roles,
  asyncHandler(activeBookingsList),
);
router.get(
  "/restaurant/orders",
  protect,
  requireApprovedHotel,
  roles,
  asyncHandler(listOrders),
);
router.post(
  "/restaurant/orders",
  protect,
  requireApprovedHotel,
  roles,
  asyncHandler(createOrder),
);
router.patch(
  "/restaurant/orders/:id",
  protect,
  requireApprovedHotel,
  roles,
  asyncHandler(updateOrder),
);
export default router;

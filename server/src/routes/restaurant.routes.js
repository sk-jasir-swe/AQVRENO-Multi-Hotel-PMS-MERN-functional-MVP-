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
import {
  protect,
  requirePermission,
  requireApprovedHotel,
} from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";

const router = Router();
router.get(
  "/restaurant/settings",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.settings.manage"),
  asyncHandler(restaurantSettings),
);
router.patch(
  "/restaurant/settings",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.settings.manage"),
  asyncHandler(updateRestaurantSettings),
);
router.get(
  "/restaurant/income",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.income.view"),
  asyncHandler(restaurantIncome),
);
router.get(
  "/restaurant/menu",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.view"),
  asyncHandler(listMenu),
);
router.post(
  "/restaurant/menu",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.menu.manage"),
  asyncHandler(createMenuItem),
);
router.patch(
  "/restaurant/menu/:id",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.menu.manage"),
  asyncHandler(updateMenuItem),
);
router.get(
  "/restaurant/active-bookings",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.view"),
  asyncHandler(activeBookingsList),
);
router.get(
  "/restaurant/orders",
  protect,
  requireApprovedHotel,
  requirePermission([
    "restaurant.orders.create",
    "restaurant.orders.update",
  ]),
  asyncHandler(listOrders),
);
router.post(
  "/restaurant/orders",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.orders.create"),
  asyncHandler(createOrder),
);
router.patch(
  "/restaurant/orders/:id",
  protect,
  requireApprovedHotel,
  requirePermission("restaurant.orders.update"),
  asyncHandler(updateOrder),
);
export default router;

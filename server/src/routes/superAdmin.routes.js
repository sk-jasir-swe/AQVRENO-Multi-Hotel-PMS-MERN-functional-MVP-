import { Router } from "express";
import {
  overview,
  listHotels,
  updateHotel,
  superAdminPlans,
  createPlan,
  updatePlan,
  superAdminSubscriptions,
  updateSubscription,
} from "../controllers/superAdmin.controller.js";
import { protect, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
const router = Router();
const superAdminOnly = [protect, allowRoles("super_admin")];
router.get(
  "/super-admin/overview",
  ...superAdminOnly,
  asyncHandler(overview),
);
router.get(
  "/super-admin/hotels",
  ...superAdminOnly,
  asyncHandler(listHotels),
);
router.patch(
  "/super-admin/hotels/:id",
  ...superAdminOnly,
  asyncHandler(updateHotel),
);
router.get(
  "/super-admin/plans",
  ...superAdminOnly,
  asyncHandler(superAdminPlans),
);
router.post(
  "/super-admin/plans",
  ...superAdminOnly,
  asyncHandler(createPlan),
);
router.patch(
  "/super-admin/plans/:id",
  ...superAdminOnly,
  asyncHandler(updatePlan),
);
router.get(
  "/super-admin/subscriptions",
  ...superAdminOnly,
  asyncHandler(superAdminSubscriptions),
);
router.patch(
  "/super-admin/subscriptions/:id",
  ...superAdminOnly,
  asyncHandler(updateSubscription),
);
export default router;

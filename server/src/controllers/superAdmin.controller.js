import Hotel from "../models/Hotel.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
export {
  superAdminPlans,
  createPlan,
  updatePlan,
  superAdminSubscriptions,
  updateSubscription,
} from "./subscription.controller.js";

export async function overview(req, res) {
  const [hotels, users, bookings, pending] = await Promise.all([
    Hotel.countDocuments(),
    User.countDocuments(),
    Booking.countDocuments(),
    Hotel.countDocuments({ status: "pending" }),
  ]);
  res.json({ stats: { hotels, users, bookings, pending } });
}

export async function listHotels(req, res) {
  const hotels = await Hotel.find().sort({ createdAt: -1 });
  res.json({ hotels });
}

export async function updateHotel(req, res) {
  const { status } = req.body;
  if (!["pending", "approved", "suspended"].includes(status))
    return res.status(400).json({ message: "Invalid status" });
  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true },
  );
  if (!hotel) return res.status(404).json({ message: "Hotel not found" });
  res.json({ hotel });
}

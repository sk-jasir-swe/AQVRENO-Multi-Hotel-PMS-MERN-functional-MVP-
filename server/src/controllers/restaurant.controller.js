import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import MenuItem from "../models/MenuItem.js";
import RestaurantOrder from "../models/RestaurantOrder.js";
import { recordActivity } from "../services/activityLog.js";
import { dateRangeForQuery } from "../utils/dateRange.js";

export async function restaurantSettings(req, res) {
  const hotel = await Hotel.findById(req.user.hotel._id)
    .select("restaurantGstRate")
    .lean();
  if (!hotel) return res.status(404).json({ message: "Hotel not found" });
  res.json({ restaurantGstRate: hotel.restaurantGstRate ?? 0 });
}

export async function updateRestaurantSettings(req, res) {
  const restaurantGstRate = Number(req.body.restaurantGstRate);
  if (
    !Number.isFinite(restaurantGstRate) ||
    restaurantGstRate < 0 ||
    restaurantGstRate > 100
  )
    return res.status(400).json({
      message: "Restaurant GST rate must be between 0 and 100",
    });
  const hotel = await Hotel.findByIdAndUpdate(
    req.user.hotel._id,
    { $set: { restaurantGstRate } },
    { new: true, runValidators: true },
  ).select("restaurantGstRate");
  if (!hotel) return res.status(404).json({ message: "Hotel not found" });
  res.json({ restaurantGstRate: hotel.restaurantGstRate });
}

export async function restaurantIncome(req, res) {
  const { range, error } = dateRangeForQuery(req.query);
  if (error) return res.status(400).json({ message: error });
  if (!range)
    return res.status(400).json({ message: "Choose a restaurant income date filter" });
  const [summary] = await RestaurantOrder.aggregate([
    {
      $match: {
        hotel: req.user.hotel._id,
        status: "served",
      },
    },
    {
      $addFields: {
        incomeAt: { $ifNull: ["$servedAt", "$updatedAt"] },
      },
    },
    {
      $match: {
        incomeAt: { $gte: range.start, $lt: range.end },
      },
    },
    {
      $group: {
        _id: null,
        income: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
  ]);
  res.json({
    period: req.query.period || (req.query.from ? "custom" : "today"),
    income: summary?.income || 0,
    servedOrders: summary?.orders || 0,
  });
}

export async function listMenu(req, res) {
  const canManageMenu = ["hotel_owner", "hotel_manager"].includes(req.user.role);
  const menu = await MenuItem.find({
    hotel: req.user.hotel._id,
    ...(!canManageMenu ? { active: true } : {}),
  }).sort({ category: 1, name: 1 });
  res.json({ menu });
}

export async function createMenuItem(req, res) {
  const { name, price } = req.body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  )
    return res.status(400).json({ message: "Enter a valid menu item and price" });
  const item = await MenuItem.create({
    hotel: req.user.hotel._id,
    name: name.trim(),
    category: req.body.category,
    price: Number(price),
  });
  res.status(201).json({ item });
}

export async function updateMenuItem(req, res) {
  const updates = {};
  if (typeof req.body.name === "string" && req.body.name.trim())
    updates.name = req.body.name.trim();
  if (typeof req.body.category === "string")
    updates.category = req.body.category.trim();
  if (req.body.price !== undefined) {
    const price = Number(req.body.price);
    if (!Number.isFinite(price) || price < 0)
      return res.status(400).json({ message: "Menu price must be non-negative" });
    updates.price = price;
  }
  if (typeof req.body.active === "boolean") updates.active = req.body.active;
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, hotel: req.user.hotel._id },
    updates,
    { new: true, runValidators: true },
  );
  if (!item) return res.status(404).json({ message: "Menu item not found" });
  res.json({ item });
}

export async function listOrders(req, res) {
  const { range, error } = dateRangeForQuery(req.query);
  if (error) return res.status(400).json({ message: error });
  const query = { hotel: req.user.hotel._id };
  if (range) query.createdAt = { $gte: range.start, $lt: range.end };
  const orders = await RestaurantOrder.find(query)
    .sort({ createdAt: -1 })
    .limit(250)
    .populate({
      path: "booking",
      populate: [
        { path: "guest", select: "name phone phoneCountryCode" },
        { path: "room", select: "number" },
      ],
    })
    .populate("createdBy", "name role");
  res.json({ orders });
}

export async function activeBookingsList(req, res) {
  const bookings = await Booking.find({
    hotel: req.user.hotel._id,
    status: "checked_in",
  })
    .sort({ checkOut: 1 })
    .limit(250)
    .populate([
      { path: "guest", select: "name phone phoneCountryCode" },
      { path: "room", select: "number" },
    ]);
  res.json({ bookings });
}

export async function createOrder(req, res) {
  const hotel = req.user.hotel._id;
  const { items, serviceType } = req.body;
  if (!["room", "table"].includes(serviceType))
    return res.status(400).json({
      message: "Choose whether this order is for room service or table service",
    });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "Add at least one menu item" });
  let booking;
  if (serviceType === "room") {
    if (!mongoose.isValidObjectId(req.body.booking))
      return res.status(400).json({ message: "Select a checked-in guest room" });
    booking = await Booking.findOne({
      _id: req.body.booking,
      hotel,
      status: "checked_in",
    }).populate("room");
    if (!booking)
      return res.status(404).json({ message: "Active room reservation not found" });
  } else if (
    req.body.booking ||
    typeof req.body.table !== "string" ||
    !req.body.table.trim()
  ) {
    return res.status(400).json({ message: "Enter a table name or number for table service" });
  }
  const menuIds = items.map((item) => item.menuItem);
  if (menuIds.some((id) => !mongoose.isValidObjectId(id)))
    return res.status(400).json({ message: "Select valid menu items" });
  const menu = await MenuItem.find({
    hotel,
    _id: { $in: menuIds },
    active: true,
  });
  if (menu.length !== new Set(menuIds.map(String)).size)
    return res.status(400).json({ message: "A selected menu item is unavailable" });
  const menuById = new Map(menu.map((item) => [String(item._id), item]));
  const orderItems = [];
  for (const entry of items) {
    const quantity = Number(entry.quantity);
    const menuItem = menuById.get(String(entry.menuItem));
    if (
      !menuItem ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1000
    )
      return res.status(400).json({ message: "Each order quantity must be a positive whole number" });
    orderItems.push({
      menuItem: menuItem._id,
      name: menuItem.name,
      quantity,
      unitPrice: menuItem.price,
      notes: typeof entry.notes === "string" ? entry.notes.trim() : "",
    });
  }
  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const hotelInfo = await Hotel.findById(hotel).select("restaurantGstRate");
  const taxRate = hotelInfo?.restaurantGstRate || 0;
  const tax = subtotal * (taxRate / 100);
  const order = await RestaurantOrder.create({
    hotel,
    booking: booking?._id,
    createdBy: req.user._id,
    serviceType,
    table:
      serviceType === "room"
        ? `Room ${booking.room.number}`
        : req.body.table.trim(),
    items: orderItems,
    subtotal,
    tax,
    taxRate,
    total: subtotal + tax,
  });
  await recordActivity(req, "restaurant_order.created", "RestaurantOrder", order._id, {
    table: order.table,
    total: order.total,
  });
  res.status(201).json({ order });
}

export async function updateOrder(req, res) {
  const { status } = req.body;
  if (!["new", "preparing", "ready", "served", "cancelled"].includes(status))
    return res.status(400).json({ message: "Select a valid restaurant order status" });
  const order = await RestaurantOrder.findOne({
    _id: req.params.id,
    hotel: req.user.hotel._id,
  });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.status === "served" || order.status === "cancelled")
    return res.status(409).json({ message: "Completed orders cannot be changed" });
  order.status = status;
  if (status === "served") order.servedAt = new Date();
  await order.save();
  await recordActivity(
    req,
    "restaurant_order.status_updated",
    "RestaurantOrder",
    order._id,
    { status },
  );
  res.json({ order });
}

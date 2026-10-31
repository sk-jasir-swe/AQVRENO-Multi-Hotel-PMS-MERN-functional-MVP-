import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Guest from "../models/Guest.js";
import Hotel from "../models/Hotel.js";
import Housekeeping from "../models/Housekeeping.js";
import Invoice from "../models/Invoice.js";
import Inventory from "../models/Inventory.js";
import MenuItem from "../models/MenuItem.js";
import Notification from "../models/Notification.js";
import Payment from "../models/Payment.js";
import RestaurantOrder from "../models/RestaurantOrder.js";
import Room from "../models/Room.js";
import Subscription from "../models/Subscription.js";
import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import { dateRangeForQuery } from "../utils/dateRange.js";
function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function exportRecords(req, res) {
  const { kind } = req.params;
  const Model =
    kind === "restaurant-orders" || kind === "restaurant-income"
      ? RestaurantOrder
      : kind === "guests"
      ? Guest
      : kind === "bookings"
        ? Booking
        : kind === "payments"
          ? Payment
          : null;
  if (!Model)
    return res.status(400).json({
      message:
        "Export guests, bookings, payments, restaurant orders or restaurant income",
    });
  const hotel = req.user.hotel._id;
  const query = { hotel };
  const { range, error } = dateRangeForQuery(req.query);
  if (error) return res.status(400).json({ message: error });
  if (kind === "restaurant-income") {
    if (!range)
      return res.status(400).json({
        message: "Choose a restaurant income date filter",
      });
    query.status = "served";
    query.$expr = {
      $and: [
        {
          $gte: [
            { $ifNull: ["$servedAt", "$updatedAt"] },
            range.start,
          ],
        },
        {
          $lt: [
            { $ifNull: ["$servedAt", "$updatedAt"] },
            range.end,
          ],
        },
      ],
    };
  } else if (range) {
    query.createdAt = { $gte: range.start, $lt: range.end };
  }
  const recordQuery = Model.find(query).sort({ createdAt: -1 }).limit(10000);
  if (kind === "bookings") recordQuery.populate("guest room");
  if (kind === "payments") recordQuery.populate("booking");
  if (kind === "restaurant-orders" || kind === "restaurant-income")
    recordQuery
      .populate({
        path: "booking",
        populate: [
          { path: "guest", select: "name phone phoneCountryCode" },
          { path: "room", select: "number" },
        ],
      })
      .populate("createdBy", "name role");
  const records = await recordQuery;
  const fields =
    kind === "restaurant-orders" || kind === "restaurant-income"
      ? []
      : kind === "guests"
      ? ["name", "gender", "email", "phoneCountryCode", "phone", "address", "source", "active", "createdAt"]
      : kind === "bookings"
        ? ["guest.name", "room.number", "checkIn", "checkOut", "status", "paymentStatus", "total", "createdAt"]
        : ["booking._id", "amount", "refundAmount", "currency", "method", "status", "reference", "createdAt", "refundedAt"];
  const valueAt = (record, path) =>
    path.split(".").reduce((value, key) => value?.[key], record);
  const displayValue = (record, field) => {
    const value = valueAt(record, field);
    if (kind === "payments" && field === "status" && value === "captured")
      return record.refundAmount > 0 ? "Paid (partially refunded)" : "Paid";
    return value;
  };
  const restaurantCsvRows = [
    [
      "Order ID",
      kind === "restaurant-income" ? "Income date" : "Ordered at",
      "Guest",
      "Guest phone",
      "Service type",
      "Room / table",
      "Items",
      "Subtotal",
      "GST",
      "GST rate",
      "Total",
      "Status",
      "Placed by",
      "Staff role",
      "Served at",
    ],
    ...records.map((record) => [
      record._id,
      kind === "restaurant-income"
        ? record.servedAt || record.updatedAt
        : record.createdAt,
      record.booking?.guest?.name || "",
      record.booking?.guest?.phone
        ? `${record.booking.guest.phoneCountryCode || "+91"} ${record.booking.guest.phone}`
        : "",
      record.serviceType === "room" || record.booking
        ? "Room service"
        : "Table service",
      record.booking?.room?.number
        ? `Room ${record.booking.room.number}`
        : record.table || "Table service",
      (record.items || [])
        .map((item) => `${item.quantity} x ${item.name} @ ${item.unitPrice}`)
        .join("; "),
      record.subtotal,
      record.tax,
      record.taxRate ??
        (record.subtotal ? (record.tax / record.subtotal) * 100 : 0),
      record.total,
      record.status,
      record.createdBy?.name || "",
      record.createdBy?.role || "",
      record.servedAt || "",
    ]),
  ];
  const csv = (
    kind === "restaurant-orders" || kind === "restaurant-income"
      ? restaurantCsvRows
      : [
          fields,
          ...records.map((record) =>
            fields.map((field) => displayValue(record, field)),
          ),
        ]
  )
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  res
    .type("text/csv")
    .set("Content-Disposition", `attachment; filename="${kind}-${Date.now()}.csv"`)
    .send(csv);
}

export async function backupHotelData(req, res) {
  const hotelId = req.user.hotel._id;
  const limit = 100000;
  const [hotel, rooms, guests, bookings, payments, invoices, housekeeping, notifications, subscriptions, staff, inventory, menuItems, restaurantOrders, supportTickets, activityLogs] =
    await Promise.all([
      Hotel.findById(hotelId).lean(),
      Room.find({ hotel: hotelId }).limit(limit + 1).lean(),
      Guest.find({ hotel: hotelId })
        .select("+governmentIdNumberEncrypted")
        .limit(limit + 1)
        .lean(),
      Booking.find({ hotel: hotelId }).limit(limit + 1).lean(),
      Payment.find({ hotel: hotelId }).limit(limit + 1).lean(),
      Invoice.find({ hotel: hotelId }).limit(limit + 1).lean(),
      Housekeeping.find({ hotel: hotelId }).limit(limit + 1).lean(),
      Notification.find({ hotel: hotelId }).limit(limit + 1).lean(),
      Subscription.find({ hotel: hotelId })
        .limit(limit + 1)
        .populate("plan", "name priceMonthly priceYearly currency limits features")
        .lean(),
      User.find({ hotel: hotelId })
        .select("name email role active createdAt updatedAt")
        .limit(limit + 1)
        .lean(),
      Inventory.find({ hotel: hotelId }).limit(limit + 1).lean(),
      MenuItem.find({ hotel: hotelId }).limit(limit + 1).lean(),
      RestaurantOrder.find({ hotel: hotelId }).limit(limit + 1).lean(),
      SupportTicket.find({ hotel: hotelId }).limit(limit + 1).lean(),
      ActivityLog.find({ hotel: hotelId }).limit(limit + 1).lean(),
    ]);
  const collections = {
    rooms,
    guests,
    bookings,
    payments,
    invoices,
    housekeeping,
    notifications,
    subscriptions,
    staff,
    inventory,
    menuItems,
    restaurantOrders,
    supportTickets,
    activityLogs,
  };
  if (
    Object.values(collections).some((records) => records.length > limit)
  ) {
    return res.status(413).json({
      message: `Backup limit is ${limit} records per collection; contact support for a larger backup`,
    });
  }
  const date = new Date().toISOString().slice(0, 10);
  res
    .type("application/json")
    .set("Content-Disposition", `attachment; filename="aqvreno-backup-${date}.json"`)
    .json({ backupVersion: 1, exportedAt: new Date().toISOString(), hotel, collections });
}

const restoreModels = {
  rooms: Room,
  guests: Guest,
  bookings: Booking,
  payments: Payment,
  invoices: Invoice,
  housekeeping: Housekeeping,
  notifications: Notification,
  inventory: Inventory,
  menuItems: MenuItem,
  restaurantOrders: RestaurantOrder,
  supportTickets: SupportTicket,
  activityLogs: ActivityLog,
};

function validateRestoreBackup(backup, hotelId) {
  if (
    !backup ||
    backup.backupVersion !== 1 ||
    !mongoose.isValidObjectId(backup.hotel?._id) ||
    !backup.hotel?._id ||
    String(backup.hotel._id) !== String(hotelId) ||
    !backup.collections ||
    typeof backup.collections !== "object" ||
    Array.isArray(backup.collections)
  )
    return "This backup is invalid or belongs to a different hotel";
  for (const [name, records] of Object.entries(backup.collections)) {
    if (!(name in restoreModels)) continue;
    if (!Array.isArray(records))
      return `Backup collection ${name} is invalid`;
    if (records.length > 100000)
      return `Backup collection ${name} exceeds the restore limit`;
    const recordIds = new Set();
    for (const record of records) {
      if (
        !record ||
        typeof record !== "object" ||
        !mongoose.isValidObjectId(record._id) ||
        String(record.hotel) !== String(hotelId)
      )
        return `Backup collection ${name} contains invalid or cross-hotel data`;
      if (recordIds.has(String(record._id)))
        return `Backup collection ${name} contains duplicate record IDs`;
      recordIds.add(String(record._id));
      if (
        (name === "payments" &&
          record.refunds !== undefined &&
          (!Array.isArray(record.refunds) ||
            record.refunds.some((refund) => !refund || typeof refund !== "object"))) ||
        (name === "restaurantOrders" &&
          record.items !== undefined &&
          (!Array.isArray(record.items) ||
            record.items.some((item) => !item || typeof item !== "object")))
      )
        return `Backup collection ${name} contains invalid nested records`;
    }
  }
  return null;
}

async function validateRestoreNaturalKeys(backup, hotelId) {
  for (const [name, Model, field] of [
    ["rooms", Room, "number"],
    ["inventory", Inventory, "sku"],
    ["menuItems", MenuItem, "name"],
  ]) {
    const records = (backup.collections[name] || []).filter(
      (record) => typeof record[field] === "string" && record[field].trim(),
    );
    if (!records.length) continue;
    const values = records.map((record) => record[field].trim());
    if (new Set(values).size !== values.length)
      return `Backup ${name} contains duplicate ${field} values`;
    const ids = records.map((record) => record._id);
    const collisions = await Model.find({
      hotel: hotelId,
      _id: { $nin: ids },
      [field]: { $in: values },
    }).distinct(field);
    if (collisions.length)
      return `Backup ${name} conflicts with existing ${field} values`;
  }
  return null;
}

async function existingIdsFor(Model, hotelId, ids) {
  const found = [];
  for (let index = 0; index < ids.length; index += 1000) {
    const chunk = ids.slice(index, index + 1000);
    found.push(
      ...(await Model.find({
        hotel: hotelId,
        _id: { $in: chunk },
      }).distinct("_id")),
    );
  }
  return found.map(String);
}

async function crossHotelIdsFor(Model, hotelId, ids) {
  const found = [];
  for (let index = 0; index < ids.length; index += 1000) {
    const chunk = ids.slice(index, index + 1000);
    found.push(
      ...(await Model.find({
        hotel: { $ne: hotelId },
        _id: { $in: chunk },
      }).distinct("_id")),
    );
  }
  return found;
}

async function validateRestoreReferences(backup, hotelId) {
  const includedIds = Object.fromEntries(
    Object.keys(restoreModels).map((name) => [
      name,
      new Set((backup.collections[name] || []).map((record) => String(record._id))),
    ]),
  );
  const referenceIds = new Map();
  let invalidReference = false;
  const addCheck = (Model, ids, included) => {
    if (!referenceIds.has(Model)) referenceIds.set(Model, new Set());
    const required = referenceIds.get(Model);
    for (const id of ids.filter(Boolean)) {
      if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        invalidReference = true;
        continue;
      }
      const value = String(id);
      if (!included.has(value)) required.add(value);
    }
  };
  for (const record of backup.collections.bookings || []) {
    addCheck(Guest, [record.guest], includedIds.guests);
    addCheck(Room, [record.room], includedIds.rooms);
  }
  for (const record of backup.collections.payments || []) {
    addCheck(Booking, [record.booking], includedIds.bookings);
    addCheck(
      User,
      [
        record.recordedBy,
        ...(record.refunds || []).map((refund) => refund.recordedBy),
      ],
      new Set(),
    );
  }
  for (const record of backup.collections.invoices || []) {
    addCheck(Booking, [record.booking], includedIds.bookings);
    addCheck(Guest, [record.guest], includedIds.guests);
  }
  for (const record of backup.collections.housekeeping || []) {
    addCheck(Room, [record.room], includedIds.rooms);
    addCheck(User, [record.assignedTo, record.createdBy], new Set());
  }
  for (const record of backup.collections.notifications || []) {
    addCheck(Booking, [record.booking], includedIds.bookings);
    addCheck(Guest, [record.guest], includedIds.guests);
    addCheck(User, [record.user], new Set());
  }
  for (const record of backup.collections.restaurantOrders || []) {
    addCheck(Booking, [record.booking], includedIds.bookings);
    addCheck(User, [record.createdBy], new Set());
    addCheck(
      MenuItem,
      (record.items || []).map((item) => item.menuItem),
      includedIds.menuItems,
    );
  }
  for (const record of backup.collections.supportTickets || [])
    addCheck(User, [record.submittedBy], new Set());
  for (const record of backup.collections.activityLogs || [])
    addCheck(User, [record.actor], new Set());
  const valid = await Promise.all(
    [...referenceIds].map(async ([Model, ids]) => {
      const required = [...ids];
      if (!required.length) return true;
      const found = await existingIdsFor(Model, hotelId, required);
      return found.length === required.length;
    }),
  );
  return !invalidReference && valid.every(Boolean)
    ? null
    : "Backup contains references to records outside this hotel or unavailable staff accounts";
}

async function restorePreview(backup, hotelId) {
  const error = validateRestoreBackup(backup, hotelId);
  if (error) return { error };
  const naturalKeyError = await validateRestoreNaturalKeys(backup, hotelId);
  if (naturalKeyError) return { error: naturalKeyError };
  const referenceError = await validateRestoreReferences(backup, hotelId);
  if (referenceError) return { error: referenceError };
  const collections = {};
  for (const [name, Model] of Object.entries(restoreModels)) {
    const records = backup.collections[name] || [];
    const ids = records.map((record) => record._id);
    if ((await crossHotelIdsFor(Model, hotelId, ids)).length)
      return {
        error: `Backup ${name} contains IDs already owned by another hotel`,
      };
    const existing = await existingIdsFor(Model, hotelId, ids);
    collections[name] = {
      backup: records.length,
      existing: existing.length,
      toRestore: records.length - existing.length,
    };
  }
  return { collections };
}

export async function previewHotelRestore(req, res) {
  const preview = await restorePreview(req.body, req.user.hotel._id);
  if (preview.error) return res.status(400).json({ message: preview.error });
  res.json({ preview: preview.collections });
}

export async function restoreHotelData(req, res) {
  if (req.body.confirm !== true)
    return res.status(400).json({ message: "Explicit restore confirmation is required" });
  const backup = req.body.backup;
  const preview = await restorePreview(backup, req.user.hotel._id);
  if (preview.error) return res.status(400).json({ message: preview.error });
  const restored = {};
  for (const [name, Model] of Object.entries(restoreModels)) {
    const records = backup.collections[name] || [];
    const ids = records.map((record) => record._id);
    const existingIds = new Set(
      await existingIdsFor(Model, req.user.hotel._id, ids),
    );
    const toInsert = records.filter(
      (record) => !existingIds.has(String(record._id)),
    );
    if (toInsert.length) await Model.insertMany(toInsert, { ordered: true });
    restored[name] = toInsert.length;
  }
  res.json({ message: "Backup records restored without overwriting existing data", restored });
}

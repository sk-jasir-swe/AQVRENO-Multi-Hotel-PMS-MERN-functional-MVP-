import Booking from "../models/Booking.js";
import DailyCloseChecklist from "../models/DailyCloseChecklist.js";
import Hotel from "../models/Hotel.js";
import Housekeeping from "../models/Housekeeping.js";
import Payment from "../models/Payment.js";
import { netPaymentExpression } from "../services/paymentLedger.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;
const sections = [
  "arrivalsReviewed",
  "departuresReviewed",
  "paymentsReviewed",
  "roomTasksReviewed",
];

function todayRange(now = new Date()) {
  const localStart = new Date(now.getTime() + IST_OFFSET_MS);
  localStart.setUTCHours(0, 0, 0, 0);
  const start = new Date(localStart.getTime() - IST_OFFSET_MS);
  return {
    dateKey: localStart.toISOString().slice(0, 10),
    start,
    end: new Date(start.getTime() + DAY_MS),
  };
}

export async function dailyClose(req, res) {
  const hotel = req.user.hotel._id;
  const { dateKey, start, end } = todayRange();
  const [arrivals, departures, unpaidBookings, roomTasks, hotelInfo, checklist] =
    await Promise.all([
      Booking.find({
        hotel,
        status: "confirmed",
        checkIn: { $gte: start, $lt: end },
      })
        .sort({ checkIn: 1 })
        .limit(200)
        .populate("guest room"),
      Booking.find({
        hotel,
        status: "checked_in",
        checkOut: { $gte: start, $lt: end },
      })
        .sort({ checkOut: 1 })
        .limit(200)
        .populate("guest room"),
      Booking.find({
        hotel,
        status: { $in: ["confirmed", "checked_in"] },
        paymentStatus: { $in: ["pending", "partial", "refunded"] },
        checkIn: { $lt: end },
        checkOut: { $gt: start },
      })
        .sort({ checkIn: 1 })
        .limit(200)
        .populate("guest room"),
      Housekeeping.find({
        hotel,
        status: { $in: ["pending", "in_progress"] },
      })
        .sort({ dueAt: 1, createdAt: 1 })
        .limit(200)
        .populate("room assignedTo", "number type name"),
      Hotel.findById(hotel).select("gstRate").lean(),
      DailyCloseChecklist.findOne({ hotel, dateKey }).lean(),
    ]);

  const bookingIds = unpaidBookings.map((booking) => booking._id);
  const paidAmounts = bookingIds.length
    ? await Payment.aggregate([
        {
          $match: {
            hotel,
            booking: { $in: bookingIds },
            status: { $in: ["captured", "refunded"] },
          },
        },
        {
          $group: {
            _id: "$booking",
            paid: { $sum: netPaymentExpression() },
          },
        },
      ])
    : [];
  const paidByBooking = new Map(
    paidAmounts.map((payment) => [String(payment._id), payment.paid]),
  );
  const taxFactor = 1 + (hotelInfo?.gstRate || 0) / 100;
  const paymentsDue = unpaidBookings.map((booking) => {
    const paid = paidByBooking.get(String(booking._id)) || 0;
    return {
      ...booking.toObject(),
      balanceDue: Math.max(booking.total * taxFactor - paid, 0),
    };
  });

  res.json({
    date: dateKey,
    arrivals,
    departures,
    paymentsDue,
    roomTasks,
    checklist: checklist || {
      arrivalsReviewed: false,
      departuresReviewed: false,
      paymentsReviewed: false,
      roomTasksReviewed: false,
      closedAt: null,
    },
  });
}

export async function updateDailyCloseChecklist(req, res) {
  const { section, reviewed } = req.body || {};
  if (!sections.includes(section) || typeof reviewed !== "boolean")
    return res.status(400).json({ message: "Invalid daily checklist update" });

  const hotel = req.user.hotel._id;
  const { dateKey } = todayRange();
  const checklist = await DailyCloseChecklist.findOneAndUpdate(
    { hotel, dateKey },
    {
      $set: { [section]: reviewed },
      $setOnInsert: { hotel, dateKey },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const allReviewed = sections.every((key) => checklist[key]);
  checklist.closedAt = allReviewed ? new Date() : undefined;
  checklist.closedBy = allReviewed ? req.user._id : undefined;
  await checklist.save();

  res.json({
    checklist: {
      arrivalsReviewed: checklist.arrivalsReviewed,
      departuresReviewed: checklist.departuresReviewed,
      paymentsReviewed: checklist.paymentsReviewed,
      roomTasksReviewed: checklist.roomTasksReviewed,
      closedAt: checklist.closedAt || null,
    },
  });
}

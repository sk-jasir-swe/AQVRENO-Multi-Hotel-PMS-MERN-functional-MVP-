import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Payment from "../models/Payment.js";
import Room from "../models/Room.js";

const DAY_MS = 24 * 60 * 60 * 1000;
function dateRange(from, to) {
  const validDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(from) || !validDate(to) || from > to) return null;
  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + DAY_MS);
  return { start, end };
}

export async function reports(req, res) {
  const range = dateRange(req.query.from, req.query.to);
  if (!range)
    return res.status(400).json({ message: "Provide a valid from and to date" });
  const hotel = req.user.hotel._id;
  const hotelInfo = await Hotel.findById(hotel).select("gstRate").lean();
  const taxFactor = 1 + (hotelInfo?.gstRate || 0) / 100;
  const [bookingStats, sourceBreakdown, payments, outstanding] =
    await Promise.all([
      Booking.aggregate([
        {
          $match: {
            hotel,
            createdAt: { $gte: range.start, $lt: range.end },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            bookingsValue: { $sum: "$total" },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            hotel,
            createdAt: { $gte: range.start, $lt: range.end },
          },
        },
        { $group: { _id: "$source", bookings: { $sum: 1 } } },
        { $sort: { bookings: -1 } },
      ]),
      Payment.aggregate([
        {
          $match: {
            hotel,
            status: "captured",
            createdAt: { $gte: range.start, $lt: range.end },
          },
        },
        {
          $group: {
            _id: "$method",
            total: {
              $sum: {
                $subtract: ["$amount", { $ifNull: ["$refundAmount", 0] }],
              },
            },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            hotel,
            status: { $nin: ["cancelled", "no_show"] },
            paymentStatus: { $in: ["pending", "partial", "refunded"] },
            createdAt: { $gte: range.start, $lt: range.end },
          },
        },
        {
          $lookup: {
            from: Payment.collection.name,
            let: { bookingId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$booking", "$$bookingId"] },
                      { $eq: ["$hotel", hotel] },
                      { $eq: ["$status", "captured"] },
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  amount: {
                    $sum: {
                      $subtract: [
                        "$amount",
                        { $ifNull: ["$refundAmount", 0] },
                      ],
                    },
                  },
                },
              },
            ],
            as: "capturedPayments",
          },
        },
        {
          $addFields: {
            remaining: {
              $max: [
                {
                  $subtract: [
                    { $multiply: ["$total", taxFactor] },
                    {
                      $ifNull: [
                        { $arrayElemAt: ["$capturedPayments.amount", 0] },
                        0,
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$remaining" },
            bookings: {
              $sum: { $cond: [{ $gt: ["$remaining", 0] }, 1, 0] },
            },
          },
        },
      ]),
    ]);
  const [stays, totalRooms, cancellationEvents, noShowEvents] = await Promise.all([
    Booking.aggregate([
      {
        $match: {
          hotel,
          status: { $in: ["checked_in", "checked_out"] },
          checkIn: { $lt: range.end },
          checkOut: { $gt: range.start },
        },
      },
      {
        $addFields: {
          periodStart: { $max: ["$checkIn", range.start] },
          periodEnd: { $min: ["$checkOut", range.end] },
        },
      },
      {
        $addFields: {
          roomNights: {
            $max: [
              0,
              {
                $dateDiff: {
                  startDate: "$periodStart",
                  endDate: "$periodEnd",
                  unit: "day",
                  timezone: "Asia/Kolkata",
                },
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          roomNights: { $sum: "$roomNights" },
          roomRevenue: {
            $sum: { $multiply: ["$nightlyRate", "$roomNights"] },
          },
        },
      },
    ]),
    Room.countDocuments({ hotel }),
    Booking.countDocuments({
      hotel,
      cancelledAt: { $gte: range.start, $lt: range.end },
    }),
    Booking.countDocuments({
      hotel,
      noShowAt: { $gte: range.start, $lt: range.end },
    }),
  ]);
  const stats = bookingStats[0] || {
    total: 0,
    bookingsValue: 0,
  };
  const periodDays = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / DAY_MS),
  );
  const occupiedRoomNights = stays[0]?.roomNights || 0;
  const roomRevenue = stays[0]?.roomRevenue || 0;
  res.json({
    period: { from: req.query.from, to: req.query.to },
    bookings: stats.total,
    cancellations: cancellationEvents,
    noShows: noShowEvents,
    occupancy: await Room.countDocuments({ hotel, status: "occupied" }),
    occupancyRate:
      totalRooms > 0
        ? Math.min(
            100,
            (occupiedRoomNights / (totalRooms * periodDays)) * 100,
          )
        : 0,
    averageDailyRate:
      occupiedRoomNights > 0 ? roomRevenue / occupiedRoomNights : 0,
    occupiedRoomNights,
    collected: payments.reduce((total, item) => total + item.total, 0),
    outstanding: outstanding[0]?.total || 0,
    outstandingBookings: outstanding[0]?.bookings || 0,
    sourceBreakdown,
    paymentBreakdown: payments,
  });
}

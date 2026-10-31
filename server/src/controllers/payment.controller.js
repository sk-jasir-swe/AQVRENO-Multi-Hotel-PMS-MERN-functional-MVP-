import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import { dateRangeForQuery } from "../utils/dateRange.js";
import { recordActivity } from "../services/activityLog.js";
import {
  netPaymentExpression,
  refundedPaymentExpression,
} from "../services/paymentLedger.js";

export async function paymentsList(req, res) {
  const { range, error } = dateRangeForQuery(req.query);
  if (error) return res.status(400).json({ message: error });
  const query = { hotel: req.user.hotel._id };
  if (range) query.createdAt = { $gte: range.start, $lt: range.end };
  const payments = await Payment.find(query)
    .sort({ createdAt: -1 })
    .limit(500)
    .populate({ path: "booking", populate: { path: "guest room" } });
  res.json({ payments });
}

export async function reconciliation(req, res) {
  const { range, error } = dateRangeForQuery({
    period: "custom",
    from: req.query.date,
    to: req.query.date,
  });
  if (error) return res.status(400).json({ message: error });
  const hotel = req.user.hotel._id;
  const hotelInfo = await Hotel.findById(hotel).select("gstRate").lean();
  const [collected, refunded, outstanding] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          hotel,
          status: { $in: ["captured", "refunded"] },
          createdAt: { $gte: range.start, $lt: range.end },
        },
      },
      { $group: { _id: "$method", total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
    Payment.aggregate([
      {
        $match: {
          hotel,
        },
      },
      {
        $addFields: {
          refundEvents: {
            $cond: [
              {
                $gt: [{ $size: { $ifNull: ["$refunds", []] } }, 0],
              },
              "$refunds",
              {
                $cond: [
                  { $gt: [{ $ifNull: ["$refundAmount", 0] }, 0] },
                  [{ amount: "$refundAmount", refundedAt: "$refundedAt" }],
                  {
                    $cond: [
                      { $eq: ["$status", "refunded"] },
                      [{ amount: "$amount", refundedAt: "$refundedAt" }],
                      [],
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      { $unwind: "$refundEvents" },
      {
        $match: {
          "refundEvents.refundedAt": {
            $gte: range.start,
            $lt: range.end,
          },
          "refundEvents.amount": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$method",
          total: { $sum: "$refundEvents.amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $match: { hotel, status: { $nin: ["cancelled", "no_show"] } } },
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
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                paid: {
                  $sum: {
                    $subtract: [
                      "$amount",
                      {
                        $ifNull: [
                          "$refundAmount",
                          {
                            $cond: [
                              { $eq: ["$status", "refunded"] },
                              "$amount",
                              0,
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          ],
          as: "ledger",
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    {
                      $multiply: [
                        "$total",
                        1 + (hotelInfo?.gstRate || 0) / 100,
                      ],
                    },
                    { $ifNull: [{ $arrayElemAt: ["$ledger.paid", 0] }, 0] },
                  ],
                },
              ],
            },
          },
        },
      },
    ]),
  ]);
  const totalCollected = collected.reduce((sum, item) => sum + item.total, 0);
  const totalRefunded = refunded.reduce((sum, item) => sum + item.total, 0);
  res.json({
    date: req.query.date,
    collected,
    refunded,
    totalCollected,
    totalRefunded,
    netCollected: totalCollected - totalRefunded,
    outstanding: outstanding[0]?.amount || 0,
  });
}

export async function recordPayment(req, res) {
  const { booking: bookingId, amount, method, reference } = req.body;
  if (
    !mongoose.isValidObjectId(bookingId) ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0 ||
    !["cash", "card", "upi", "bank_transfer"].includes(method)
  ) {
    return res.status(400).json({
      message: "Select a booking, valid amount and supported payment method",
    });
  }
  const hotel = req.user.hotel._id;
  const booking = await Booking.findOne({ _id: bookingId, hotel });
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (booking.status === "cancelled")
    return res.status(409).json({
      message: "Payments cannot be recorded for cancelled reservations",
    });
  const paidSoFar = await Payment.aggregate([
    { $match: { hotel, booking: booking._id, status: "captured" } },
    {
      $group: {
        _id: null,
        total: {
          $sum: netPaymentExpression(),
        },
      },
    },
  ]);
  const hotelInfo = await Hotel.findById(hotel).select("gstRate");
  const taxRate = hotelInfo?.gstRate || 0;
  const due = booking.total * (1 + taxRate / 100) - (paidSoFar[0]?.total || 0);
  const paidAmount = Number(amount);
  if (paidAmount > due + 0.005)
    return res.status(400).json({ message: "Payment exceeds the remaining balance" });

  const payment = await Payment.create({
    hotel,
    booking: booking._id,
    amount: paidAmount,
    method,
    reference,
    status: "captured",
    recordedBy: req.user._id,
  });
  const totalPaid = (paidSoFar[0]?.total || 0) + paidAmount;
  const totalDue = booking.total * (1 + taxRate / 100);
  booking.paymentStatus = totalPaid + 0.005 >= totalDue ? "paid" : "partial";
  booking.paidAt = booking.paymentStatus === "paid" ? new Date() : undefined;
  await booking.save();
  await Invoice.updateMany(
    { hotel, booking: booking._id, status: { $ne: "void" } },
    {
      $set: {
        amountPaid: totalPaid,
        status: booking.paymentStatus === "paid" ? "paid" : "issued",
      },
    },
  );
  await recordActivity(req, "payment.recorded", "Payment", payment._id, {
    amount: paidAmount,
    method,
    booking: booking._id,
  });
  res.status(201).json({ payment, booking });
}

export async function refundPayment(req, res) {
  const hotel = req.user.hotel._id;
  const payment = await Payment.findOne({
    _id: req.params.id,
    hotel,
    status: "captured",
  });
  if (!payment)
    return res.status(404).json({ message: "Captured payment not found" });
  const remainingPayment = payment.amount - (payment.refundAmount || 0);
  const refundAmount =
    req.body.amount === undefined ? remainingPayment : Number(req.body.amount);
  if (
    !Number.isFinite(refundAmount) ||
    refundAmount <= 0 ||
    refundAmount > remainingPayment + 0.005
  )
    return res.status(400).json({
      message: "Refund must be positive and cannot exceed the remaining payment",
    });
  const booking = await Booking.findOne({ _id: payment.booking, hotel });
  if (!booking)
    return res.status(404).json({ message: "Payment reservation not found" });
  if (booking.status === "cancelled") {
    const refunded = await Payment.aggregate([
      { $match: { hotel, booking: booking._id } },
      {
        $group: {
          _id: null,
          amount: { $sum: refundedPaymentExpression() },
        },
      },
    ]);
    const refundRemaining =
      (booking.cancellationRefundEligible || 0) - (refunded[0]?.amount || 0);
    if (refundAmount > refundRemaining + 0.005)
      return res.status(409).json({
        message: "Refund exceeds the cancellation policy's eligible amount",
      });
  }
  payment.refundAmount = (payment.refundAmount || 0) + refundAmount;
  const refundedAt = new Date();
  payment.refunds.push({
    amount: refundAmount,
    recordedBy: req.user._id,
    refundedAt,
  });
  if (payment.refundAmount + 0.005 >= payment.amount) {
    payment.refundAmount = payment.amount;
    payment.status = "refunded";
  }
  payment.refundedAt = refundedAt;
  await payment.save();
  const captured = await Payment.aggregate([
    { $match: { hotel, booking: payment.booking, status: "captured" } },
    {
      $group: {
        _id: null,
        total: {
          $sum: netPaymentExpression(),
        },
      },
    },
  ]);
  const totalPaid = captured[0]?.total || 0;
  const hotelInfo = await Hotel.findById(hotel).select("gstRate");
  const totalDue = booking.total * (1 + (hotelInfo?.gstRate || 0) / 100);
  booking.paymentStatus =
    totalPaid === 0 ? "refunded" : totalPaid >= totalDue ? "paid" : "partial";
  booking.paidAt =
    booking.paymentStatus === "paid" ? booking.paidAt : undefined;
  await booking.save();
  await Invoice.updateMany(
    { hotel, booking: booking._id, status: { $ne: "void" } },
    {
      $set: {
        amountPaid: totalPaid,
        status: totalPaid >= totalDue ? "paid" : "issued",
      },
    },
  );
  await recordActivity(req, "payment.refunded", "Payment", payment._id, {
    amount: refundAmount,
    booking: booking._id,
  });
  res.json({ payment, booking });
}

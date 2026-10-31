import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Guest from "../models/Guest.js";
import Hotel from "../models/Hotel.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import Room from "../models/Room.js";
import { assertRoomAvailable } from "../services/bookingService.js";
import { notifyBookingEvent } from "../services/notificationService.js";
import { recordActivity } from "../services/activityLog.js";
import { netPaymentExpression } from "../services/paymentLedger.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

function dateRangeForPeriod(period, now = new Date()) {
  const localStart = new Date(now.getTime() + IST_OFFSET_MS);
  localStart.setUTCHours(0, 0, 0, 0);
  if (period === "week") {
    localStart.setUTCDate(
      localStart.getUTCDate() - ((localStart.getUTCDay() + 6) % 7),
    );
  } else if (period === "month") {
    localStart.setUTCDate(1);
  }
  const start = new Date(localStart.getTime() - IST_OFFSET_MS);
  if (period === "today") return { start, end: new Date(start.getTime() + DAY_MS) };
  if (period === "week") return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
  if (period === "month") {
    const days = new Date(
      Date.UTC(localStart.getUTCFullYear(), localStart.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return { start, end: new Date(start.getTime() + days * DAY_MS) };
  }
  return null;
}

function customDateRange(from, to) {
  const isDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };
  if (!isDate(from) || !isDate(to) || from > to) return null;
  return {
    start: new Date(`${from}T00:00:00+05:30`),
    end: new Date(
      new Date(`${to}T00:00:00+05:30`).getTime() + DAY_MS,
    ),
  };
}

function indiaDateKey(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function indiaWeekday(date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

async function sendBookingStatusNotification(booking, hotel, type) {
  const [populated, hotelInfo] = await Promise.all([
    Booking.findById(booking._id).populate("guest room"),
    Hotel.findById(hotel).select("name"),
  ]);
  if (!populated?.guest || !hotelInfo) return;
  await notifyBookingEvent({
    hotel,
    hotelName: hotelInfo.name,
    booking: populated,
    guest: populated.guest,
    type,
    dedupeKey: `${type}:${booking._id}`,
  });
}

export async function list(req, res) {
  const { period } = req.query;
  let range;
  if (period === "custom") range = customDateRange(req.query.from, req.query.to);
  else if (["today", "week", "month"].includes(period))
    range = dateRangeForPeriod(period);
  else if (period && period !== "all")
    return res.status(400).json({ message: "Invalid booking date filter" });
  if (period && period !== "all" && !range)
    return res.status(400).json({
      message: "Choose a valid date range with start date on or before end date",
    });
  const query = { hotel: req.user.hotel._id };
  if (range) query.createdAt = { $gte: range.start, $lt: range.end };
  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .limit(250)
    .populate("guest room");
  res.json({ items: bookings });
}

export async function create(req, res) {
  const { guest, room, checkIn, checkOut } = req.body;
  if (
    !mongoose.isValidObjectId(guest) ||
    !mongoose.isValidObjectId(room) ||
    !checkIn ||
    !checkOut
  ) {
    return res.status(400).json({
      message: "Select a guest, a room, check-in and check-out dates",
    });
  }
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.ceil((end - start) / DAY_MS);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    nights < 1
  ) {
    return res.status(400).json({
      message: "Check-out must be at least one night after check-in",
    });
  }

  const hotel = req.user.hotel._id;
  const [guestRecord, roomRecord] = await Promise.all([
    Guest.findOne({ _id: guest, hotel }),
    Room.findOne({ _id: room, hotel }),
  ]);
  if (!guestRecord)
    return res.status(404).json({ message: "Guest not found for this hotel" });
  const guestCheckedIn = await Booking.exists({
    hotel,
    guest: guestRecord._id,
    status: "checked_in",
  });
  if (guestCheckedIn)
    return res.status(409).json({
      message: "A guest who is currently checked in cannot be booked again",
    });
  if (!guestRecord.active)
    return res.status(409).json({
      message: "Guest is inactive. Reactivate them in the Guests section first.",
    });
  if (!roomRecord)
    return res.status(404).json({ message: "Selected room not found" });
  if (roomRecord.status !== "available")
    return res
      .status(409)
      .json({ message: "Selected room is not available for a new booking" });
  if (await Booking.exists({ hotel, room, status: "checked_in" }))
    return res
      .status(409)
      .json({ message: "This room already has a guest checked in" });

  await assertRoomAvailable({ hotel, room, checkIn: start, checkOut: end });
  const booking = await Booking.create({
    hotel,
    guest: guestRecord._id,
    room: roomRecord._id,
    checkIn: start,
    checkOut: end,
    nightlyRate: roomRecord.price,
    total: roomRecord.price * nights,
    adults: 1 + guestRecord.additionalGuests.length,
    source: guestRecord.source,
  });
  const populated = await Booking.findById(booking._id).populate("guest room");
  const hotelInfo = await Hotel.findById(hotel).select("name");
  await notifyBookingEvent({
    hotel,
    hotelName: hotelInfo.name,
    booking: populated,
    guest: populated.guest,
    type: "booking_confirmed",
    dedupeKey: `booking-confirmed:${populated._id}`,
  });
  await recordActivity(req, "booking.created", "Booking", populated._id, {
    guest: populated.guest?.name,
    room: populated.room?.number,
  });
  res.status(201).json({ item: populated });
}

export async function update(req, res) {
  if (req.body.paymentStatus)
    return res.status(400).json({
      message: "Record or refund payments in the Payments section",
    });
  const hotel = req.user.hotel._id;
  const booking = await Booking.findOne({ _id: req.params.id, hotel });
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  const { status } = req.body;
  if (
    !["confirmed", "checked_in", "checked_out", "cancelled", "no_show"].includes(
      status,
    )
  )
    return res.status(400).json({ message: "Invalid booking status" });

  if (status === "confirmed" && booking.status !== "confirmed")
    return res.status(409).json({
      message: "Only confirmed reservations can remain confirmed",
    });

  if (status === "checked_in") {
    if (booking.status !== "confirmed")
      return res.status(409).json({
        message: "Only confirmed reservations can be checked in",
      });
    const anotherCheckedIn = await Booking.exists({
      _id: { $ne: booking._id },
      hotel,
      room: booking.room,
      status: "checked_in",
    });
    if (anotherCheckedIn)
      return res.status(409).json({
        message: "Another guest is already checked into this room",
      });
    const { identityDocumentType, identityLast4, identityConsent } = req.body;
    if (
      !["passport", "drivers_license", "national_id", "other"].includes(
        identityDocumentType,
      ) ||
      typeof identityLast4 !== "string" ||
      !/^\d{4}$/.test(identityLast4) ||
      identityConsent !== true
    )
      return res.status(400).json({
        message: "Record the ID type, last four digits and guest consent before check-in",
      });
    booking.identityDocumentType = identityDocumentType;
    booking.identityLast4 = identityLast4;
    booking.identityVerifiedAt = new Date();
    booking.identityConsentAt = new Date();
    booking.status = status;
    booking.checkedInAt = booking.checkedInAt || new Date();
    await booking.save();
    await Room.updateOne(
      { _id: booking.room, hotel },
      { $set: { status: "occupied" } },
    );
    await Guest.updateOne(
      { _id: booking.guest, hotel },
      { $set: { active: true } },
    );
    await sendBookingStatusNotification(booking, hotel, "checked_in");
    await recordActivity(req, "booking.checked_in", "Booking", booking._id, {
      room: booking.room,
    });
    return res.json({ item: booking });
  }

  if (status === "checked_out" && booking.status !== "checked_in")
    return res.status(409).json({
      message: "Only checked-in reservations can be checked out",
    });
  if (status === "cancelled" && booking.status !== "confirmed")
    return res.status(409).json({
      message: "Only confirmed reservations can be cancelled",
    });
  if (status === "cancelled") {
    const reason =
      typeof req.body.cancellationReason === "string"
        ? req.body.cancellationReason.trim()
        : "";
    if (!reason || reason.length > 500)
      return res.status(400).json({
        message: "Enter a cancellation reason of 500 characters or fewer",
      });
    const hotelInfo = await Hotel.findById(hotel).select(
      "gstRate cancellationCutoffHours cancellationRefundPercent",
    );
    if (!hotelInfo)
      return res.status(404).json({ message: "Hotel settings not found" });
    const paid = await Payment.aggregate([
      {
        $match: {
          hotel,
          booking: booking._id,
          status: { $in: ["captured", "refunded"] },
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: netPaymentExpression(),
          },
        },
      },
    ]);
    const cutoff = Number(hotelInfo.cancellationCutoffHours ?? 24);
    const withinCutoff =
      Date.now() <= booking.checkIn.getTime() - cutoff * 60 * 60 * 1000;
    booking.cancellationReason = reason;
    booking.cancellationRefundPercent = withinCutoff
      ? Number(hotelInfo.cancellationRefundPercent ?? 100)
      : 0;
    booking.cancellationRefundEligible =
      (paid[0]?.amount || 0) * (booking.cancellationRefundPercent / 100);
    booking.cancelledAt = new Date();
  }
  if (status === "no_show") {
    if (booking.status !== "confirmed")
      return res.status(409).json({
        message: "Only confirmed reservations can be marked no-show",
      });
    if (Date.now() < booking.checkIn.getTime())
      return res.status(409).json({
        message: "A reservation can only be marked no-show on or after check-in",
      });
    booking.noShowAt = new Date();
  }
  booking.status = status;
  if (status === "checked_out")
    booking.checkedOutAt = booking.checkedOutAt || new Date();
  await booking.save();

  if (status === "checked_out" || status === "cancelled") {
    const [anotherCheckedIn, anotherActiveBooking] = await Promise.all([
      Booking.exists({
        _id: { $ne: booking._id },
        hotel,
        room: booking.room,
        status: "checked_in",
      }),
      Booking.exists({
        _id: { $ne: booking._id },
        hotel,
        guest: booking.guest,
        status: { $in: ["confirmed", "checked_in"] },
      }),
    ]);
    if (!anotherCheckedIn)
      await Room.updateOne(
        { _id: booking.room, hotel, status: "occupied" },
        { $set: { status: "available" } },
      );
    if (status === "checked_out" && !anotherActiveBooking)
      await Guest.updateOne(
        { _id: booking.guest, hotel },
        { $set: { active: false } },
      );
    if (status === "checked_out")
      await sendBookingStatusNotification(booking, hotel, "checked_out");
  }
  if (status === "no_show") {
    const [anotherCheckedIn, anotherActiveBooking] = await Promise.all([
      Booking.exists({
        _id: { $ne: booking._id },
        hotel,
        room: booking.room,
        status: "checked_in",
      }),
      Booking.exists({
        _id: { $ne: booking._id },
        hotel,
        room: booking.room,
        status: { $in: ["confirmed", "checked_in"] },
      }),
    ]);
    if (!anotherCheckedIn && !anotherActiveBooking)
      await Room.updateOne(
        { _id: booking.room, hotel },
        { $set: { status: "available" } },
      );
  }
  if (status === "confirmed")
    await Guest.updateOne(
      { _id: booking.guest, hotel },
      { $set: { active: true } },
    );
  await recordActivity(
    req,
    `booking.${status}`,
    "Booking",
    booking._id,
    status === "cancelled"
      ? {
          reason: booking.cancellationReason,
          refundEligible: booking.cancellationRefundEligible,
        }
      : {},
  );
  res.json({ item: booking });
}

export async function remove(req, res) {
  const hotel = req.user.hotel._id;
  const booking = await Booking.findOne({
    _id: req.params.id,
    hotel,
  });
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (booking.status === "checked_in")
    return res.status(409).json({
      message: "Check out the guest before deleting this active booking",
    });
  const [payment, invoice] = await Promise.all([
    Payment.exists({ hotel, booking: booking._id }),
    Invoice.exists({ hotel, booking: booking._id }),
  ]);
  if (payment || invoice)
    return res.status(409).json({
      message: "Reservations with payment or invoice records cannot be deleted",
    });
  await booking.deleteOne();
  res.json({ message: "Deleted" });
}

export async function dashboard(req, res) {
  const hotel = req.user.hotel._id;
  const period = req.query.period || "week";
  const now = new Date();
  const range =
    period === "custom"
      ? customDateRange(req.query.from, req.query.to)
      : dateRangeForPeriod(period, now);
  if (!range)
    return res.status(400).json({ message: "Invalid dashboard period" });

  const start = range.start;
  const days = Math.ceil((range.end - range.start) / DAY_MS);
  const endExclusive = now < range.end ? now : range.end;
  if (endExclusive <= start)
    return res
      .status(400)
      .json({ message: "Selected date range is in the future" });
  const [rooms, checkedInRoomIds, guests, activeBookings, revenue, upcoming] =
    await Promise.all([
      Room.find({ hotel }).select("status").lean(),
      Booking.distinct("room", { hotel, status: "checked_in" }),
      Guest.countDocuments({
        hotel,
        createdAt: { $gte: start, $lt: endExclusive },
      }),
      Booking.countDocuments({
        hotel,
        status: { $nin: ["cancelled", "checked_out", "no_show"] },
      }),
      Payment.aggregate([
        {
          $match: {
            hotel,
            status: "captured",
            createdAt: { $gte: start, $lt: endExclusive },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$createdAt",
                format: "%Y-%m-%d",
                timezone: "Asia/Kolkata",
              },
            },
            revenue: { $sum: netPaymentExpression() },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Booking.find({ hotel, status: { $in: ["confirmed", "checked_in"] } })
        .sort({ checkIn: 1 })
        .limit(6)
        .populate("guest room"),
    ]);

  const checkedIn = new Set(checkedInRoomIds.map(String));
  const roomStatuses = {
    available: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0,
  };
  for (const room of rooms) {
    const status = checkedIn.has(String(room._id)) ? "occupied" : room.status;
    roomStatuses[status] += 1;
  }
  const revenueByDate = new Map(
    revenue.map(({ _id, revenue: amount }) => [_id, amount]),
  );
  const revenueSeries = Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    return {
      label:
        period === "today"
          ? "Today"
          : period === "week"
            ? indiaWeekday(date)
            : new Intl.DateTimeFormat("en-IN", {
                day: "numeric",
                month: "short",
                timeZone: "Asia/Kolkata",
              }).format(date),
      revenue: revenueByDate.get(indiaDateKey(date)) || 0,
    };
  });
  const occupied = roomStatuses.occupied;
  res.json({
    stats: {
      rooms: rooms.length,
      guests,
      activeBookings,
      revenue: revenue.reduce((total, entry) => total + entry.revenue, 0),
      occupancy: rooms.length
        ? Math.round((occupied / rooms.length) * 100)
        : 0,
      occupied,
      roomStatuses,
    },
    period,
    revenueSeries,
    upcoming,
  });
}

export async function calendar(req, res) {
  const month = req.query.month;
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month))
    return res.status(400).json({ message: "Provide month as YYYY-MM" });
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  if (monthNumber < 1 || monthNumber > 12)
    return res.status(400).json({ message: "Invalid month" });
  const start = new Date(Date.UTC(year, monthNumber - 1, 1) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, monthNumber, 1) - IST_OFFSET_MS);
  const bookings = await Booking.find({
    hotel: req.user.hotel._id,
    status: { $nin: ["cancelled", "checked_out", "no_show"] },
    checkIn: { $lt: end },
    checkOut: { $gt: start },
  })
    .sort({ checkIn: 1 })
    .populate("guest room");
  res.json({ bookings });
}

export async function frontDesk(req, res) {
  const localNow = new Date(Date.now() + IST_OFFSET_MS);
  localNow.setUTCHours(0, 0, 0, 0);
  const today = new Date(localNow.getTime() - IST_OFFSET_MS);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const [arrivals, inHouse, departures] = await Promise.all([
    Booking.find({
      hotel: req.user.hotel._id,
      $or: [
        {
          status: "confirmed",
          checkIn: { $gte: today, $lt: tomorrow },
        },
        { status: "checked_in" },
      ],
    })
      .sort({ checkIn: 1 })
      .populate("guest room"),
    Booking.find({ hotel: req.user.hotel._id, status: "checked_in" })
      .sort({ checkOut: 1 })
      .populate("guest room"),
    Booking.find({
      hotel: req.user.hotel._id,
      status: "checked_in",
      checkOut: { $gte: today, $lt: tomorrow },
    }).populate("guest room"),
  ]);
  res.json({ arrivals, inHouse, departures });
}

export async function createInvoice(req, res) {
  const hotelId = req.user.hotel._id;
  const hotel = await Hotel.findById(hotelId);
  const booking = await Booking.findOne({
    _id: req.params.bookingId,
    hotel: hotelId,
  }).populate("guest room");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  let invoice = await Invoice.findOne({
    hotel: hotelId,
    booking: booking._id,
    status: { $ne: "void" },
  });
  if (!invoice) {
    const nights = Math.max(
      1,
      Math.ceil((booking.checkOut - booking.checkIn) / DAY_MS),
    );
    const subtotal = booking.total;
    const taxRate = hotel.gstRate || 0;
    const taxTotal = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const nextHotel = await Hotel.findOneAndUpdate(
      { _id: hotelId },
      { $inc: { invoiceSequence: 1 } },
      { new: true },
    );
    const year = new Date()
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
      .slice(0, 4);
    invoice = await Invoice.create({
      hotel: hotelId,
      booking: booking._id,
      guest: booking.guest._id,
      number: `INV-${year}-${String(nextHotel.invoiceSequence).padStart(6, "0")}`,
      gstin: hotel.gstin,
      lineItems: [
        {
          description: `Room ${booking.room.number} (${booking.room.type}) · ${nights} nights`,
          quantity: nights,
          unitPrice: booking.nightlyRate,
          taxRate,
          amount: subtotal,
        },
      ],
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
      amountPaid: await Payment.aggregate([
        {
          $match: {
            hotel: hotelId,
            booking: booking._id,
            status: "captured",
          },
        },
        { $group: { _id: null, total: { $sum: netPaymentExpression() } } },
      ]).then((rows) => rows[0]?.total || 0),
      status: booking.paymentStatus === "paid" ? "paid" : "issued",
    });
  }
  res.json({ invoice, hotel, booking });
}

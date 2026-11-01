import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { notifyBookingEvent } from "./notificationService.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

function startOfTodayInIndia(now = new Date()) {
  const local = new Date(now.getTime() + IST_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - IST_OFFSET_MS);
}

function indiaDateKey(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export async function runReminderSweep() {
  const today = startOfTodayInIndia();
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const dayAfter = new Date(tomorrow.getTime() + DAY_MS);
  const [arrivals, departures, paymentDue] = await Promise.all([
    Booking.find({
      status: "confirmed",
      checkIn: { $gte: tomorrow, $lt: dayAfter },
    })
      .populate("hotel guest room")
      .limit(500),
    Booking.find({
      status: "checked_in",
      checkOut: { $gte: today, $lt: tomorrow },
    })
      .populate("hotel guest room")
      .limit(500),
    Booking.find({
      status: "checked_in",
      paymentStatus: { $in: ["pending", "partial"] },
      checkOut: { $gte: today, $lt: tomorrow },
    })
      .populate("hotel guest room")
      .limit(500),
  ]);
  for (const booking of arrivals) {
    if (!booking.guest || !booking.hotel) continue;
    await notifyBookingEvent({
      hotel: booking.hotel._id,
      hotelName: booking.hotel.name,
      booking,
      guest: booking.guest,
      type: "checkin_reminder",
      dedupeKey: `checkin-reminder:${booking._id}:${indiaDateKey(tomorrow)}`,
    });
  }
  for (const booking of departures) {
    if (!booking.guest || !booking.hotel) continue;
    await notifyBookingEvent({
      hotel: booking.hotel._id,
      hotelName: booking.hotel.name,
      booking,
      guest: booking.guest,
      type: "checkout_reminder",
      dedupeKey: `checkout-reminder:${booking._id}:${indiaDateKey(today)}`,
    });
  }
  for (const booking of paymentDue) {
    if (!booking.guest || !booking.hotel) continue;
    await notifyBookingEvent({
      hotel: booking.hotel._id,
      hotelName: booking.hotel.name,
      booking,
      guest: booking.guest,
      type: "payment_due_reminder",
      dedupeKey: `payment-due-reminder:${booking._id}:${indiaDateKey(today)}`,
    });
  }

  const backupDueBefore = new Date(Date.now() - 7 * DAY_MS);
  const overdueHotels = await Hotel.find({
    status: "approved",
    $or: [
      { backupLastDownloadedAt: { $exists: false } },
      { backupLastDownloadedAt: null },
      { backupLastDownloadedAt: { $lte: backupDueBefore } },
    ],
  })
    .select("_id name")
    .limit(500);
  const owners = await User.find({
    hotel: { $in: overdueHotels.map((hotel) => hotel._id) },
    role: "hotel_owner",
    active: true,
  }).select("_id hotel");
  const hotelNames = new Map(
    overdueHotels.map((hotel) => [String(hotel._id), hotel.name]),
  );
  const todayKey = indiaDateKey(today);
  for (const owner of owners) {
    const hotelId = String(owner.hotel);
    const dedupeKey = `backup-reminder:${hotelId}:${owner._id}:${todayKey}`;
    await Notification.create({
      hotel: owner.hotel,
      user: owner._id,
      type: "backup_reminder",
      channel: "in_app",
      subject: "Weekly hotel backup reminder",
      message: `Download a fresh backup for ${hotelNames.get(hotelId) || "your hotel"} from Hotel settings. The last backup is more than 7 days old.`,
      dedupeKey,
      status: "queued",
    }).catch((error) => {
      if (error.code !== 11000) throw error;
    });
  }
  return {
    arrivals: arrivals.length,
    departures: departures.length,
    paymentDue: paymentDue.length,
    backupReminders: owners.length,
  };
}

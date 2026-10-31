import Booking from "../models/Booking.js";
import { notifyBookingEvent } from "./notificationService.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

function startOfTodayInIndia(now = new Date()) {
  const local = new Date(now.getTime() + IST_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - IST_OFFSET_MS);
}

export async function runReminderSweep() {
  const today = startOfTodayInIndia();
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const dayAfter = new Date(tomorrow.getTime() + DAY_MS);
  const [arrivals, departures] = await Promise.all([
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
  ]);
  for (const booking of arrivals) {
    if (!booking.guest || !booking.hotel) continue;
    await notifyBookingEvent({
      hotel: booking.hotel._id,
      hotelName: booking.hotel.name,
      booking,
      guest: booking.guest,
      type: "checkin_reminder",
      dedupeKey: `checkin-reminder:${booking._id}:${tomorrow.toISOString().slice(0, 10)}`,
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
      dedupeKey: `checkout-reminder:${booking._id}:${today.toISOString().slice(0, 10)}`,
    });
  }
  return { arrivals: arrivals.length, departures: departures.length };
}

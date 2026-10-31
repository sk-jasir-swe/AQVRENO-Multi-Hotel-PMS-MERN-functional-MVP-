import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendEmail } from "./emailService.js";

const STAFF_ROLES = ["hotel_owner", "hotel_manager", "receptionist"];

function messageFor(type, booking, hotelName) {
  const guestName = booking.guest?.name || "Guest";
  const roomNumber = booking.room?.number || "your room";
  const checkIn = new Date(booking.checkIn).toLocaleDateString("en-IN");
  const checkOut = new Date(booking.checkOut).toLocaleDateString("en-IN");
  const messages = {
    booking_confirmed: `Hi ${guestName}, your booking at ${hotelName} is confirmed. Check-in: ${checkIn}; check-out: ${checkOut}.`,
    checkin_reminder: `Hi ${guestName}, this is a reminder for your stay at ${hotelName} tomorrow. Room ${roomNumber}; check-in: ${checkIn}.`,
    checkout_reminder: `Hi ${guestName}, your stay at ${hotelName} is scheduled to check out today (${checkOut}). Please contact the front desk if you need help.`,
    checked_in: `Hi ${guestName}, you have checked in to ${roomNumber} at ${hotelName}. Have a pleasant stay.`,
    checked_out: `Hi ${guestName}, thank you for staying at ${hotelName}. We hope to welcome you again.`,
  };
  return messages[type] || `Stay update for your booking at ${hotelName}.`;
}

async function deliverGuestChannel({
  hotel,
  booking,
  guest,
  type,
  channel,
  recipient,
  subject,
  message,
  dedupeKey,
}) {
  if (dedupeKey) {
    const existing = await Notification.findOne({ dedupeKey });
    if (existing) return existing;
  }
  let notification;
  try {
    notification = await Notification.create({
      hotel,
      booking: booking._id,
      guest: guest._id,
      type,
      channel,
      subject,
      message,
      dedupeKey,
      status: "queued",
    });
  } catch (error) {
    if (error.code === 11000 && dedupeKey)
      return Notification.findOne({ dedupeKey });
    throw error;
  }
  try {
    if (channel === "email") {
      await sendEmail({ to: recipient, subject, text: message });
    } else {
      const { MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, MSG91_SENDER_ID } =
        process.env;
      if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID || !MSG91_SENDER_ID)
        throw new Error(
          "MSG91 is not configured; set MSG91_AUTH_KEY, MSG91_TEMPLATE_ID and MSG91_SENDER_ID",
        );
      const mobile = recipient.replace(/[^\d]/g, "");
      if (mobile.length < 10)
        throw new Error("Guest phone number is not valid for SMS");
      const response = await fetch(
        process.env.MSG91_FLOW_URL ||
          "https://control.msg91.com/api/v5/flow/",
        {
          method: "POST",
          headers: {
            authkey: MSG91_AUTH_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            template_id: MSG91_TEMPLATE_ID,
            sender: MSG91_SENDER_ID,
            recipients: [
              {
                mobiles: mobile,
                VAR1: guest.name,
                VAR2: message,
              },
            ],
          }),
        },
      );
      if (!response.ok)
        throw new Error(`MSG91 request failed with HTTP ${response.status}`);
    }
    notification.status = "sent";
    notification.sentAt = new Date();
  } catch (error) {
    notification.status = "failed";
    notification.error = error.message;
  }
  await notification.save();
  return notification;
}

export async function notifyBookingEvent({
  hotel,
  hotelName,
  booking,
  guest,
  type,
  dedupeKey,
}) {
  const message = messageFor(
    type,
    { ...(booking.toObject?.() ?? booking), guest },
    hotelName,
  );
  const subject = `AQVRENO: ${type.replaceAll("_", " ")}`;
  const staff = await User.find({
    hotel,
    active: true,
    role: { $in: STAFF_ROLES },
  }).select("_id");
  for (const user of staff) {
    await Notification.create({
      hotel,
      user: user._id,
      booking: booking._id,
      guest: guest._id,
      type,
      channel: "in_app",
      subject,
      message,
      dedupeKey: dedupeKey ? `${dedupeKey}:staff:${user._id}` : undefined,
      status: "queued",
    }).catch((error) => {
      if (error.code !== 11000) throw error;
    });
  }
  if (guest.email) {
    await deliverGuestChannel({
      hotel,
      booking,
      guest,
      type,
      channel: "email",
      recipient: guest.email,
      subject,
      message,
      dedupeKey: dedupeKey ? `${dedupeKey}:email` : undefined,
    });
  }
  if (guest.smsConsent && guest.phone) {
    await deliverGuestChannel({
      hotel,
      booking,
      guest,
      type,
      channel: "sms",
      recipient: guest.phone.startsWith("+")
        ? guest.phone
        : `${guest.phoneCountryCode || "+91"}${guest.phone}`,
      subject,
      message,
      dedupeKey: dedupeKey ? `${dedupeKey}:sms` : undefined,
    });
  }
}

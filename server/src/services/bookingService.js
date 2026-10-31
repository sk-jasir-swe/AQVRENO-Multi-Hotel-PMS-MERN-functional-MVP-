import Booking from "../models/Booking.js";
export async function assertRoomAvailable({
  hotel,
  room,
  checkIn,
  checkOut,
  excludeId,
}) {
  const overlap = {
    hotel,
    room,
    status: { $nin: ["cancelled", "checked_out", "no_show"] },
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) },
  };
  if (excludeId) overlap._id = { $ne: excludeId };
  if (await Booking.exists(overlap)) {
    const e = new Error("Room is not available for the selected dates");
    e.status = 409;
    throw e;
  }
  return true;
}

import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import { isValidPhone } from "../utils/phone.js";

export async function hotelSettings(req, res) {
  const hotel = await Hotel.findById(req.user.hotel._id).select(
    "name email phone phoneCountryCode address city country gstin gstRate cancellationCutoffHours cancellationRefundPercent floors backupLastDownloadedAt",
  );
  res.json({ hotel });
}

export async function updateHotelFloors(req, res) {
  const { floors } = req.body;
  if (
    !Array.isArray(floors) ||
    floors.length < 1 ||
    floors.length > 50 ||
    floors.some(
      (floor) =>
        typeof floor !== "string" ||
        !floor.trim() ||
        floor.trim().length > 40,
    )
  ) {
    return res.status(400).json({
      message: "Add between 1 and 50 valid floor names (up to 40 characters each)",
    });
  }
  const normalizedFloors = floors.map((floor) => floor.trim());
  if (normalizedFloors[0].toLowerCase() !== "ground")
    return res.status(400).json({ message: "Ground floor must be first" });
  if (
    new Set(normalizedFloors.map((floor) => floor.toLowerCase())).size !==
    normalizedFloors.length
  )
    return res.status(400).json({ message: "Floor names must be unique" });

  const hotelId = req.user.hotel._id;
  const assignedRoom = await Room.exists({
    hotel: hotelId,
    floor: { $exists: true, $nin: normalizedFloors },
  });
  if (assignedRoom)
    return res.status(409).json({
      message: "Move rooms from removed floors before removing those floors",
    });

  const hotel = await Hotel.findByIdAndUpdate(
    hotelId,
    { $set: { floors: normalizedFloors } },
    { new: true, runValidators: true },
  ).select("floors");
  if (!hotel) return res.status(404).json({ message: "Hotel not found" });
  res.json({ floors: hotel.floors });
}

export async function updateHotelSettings(req, res) {
  const currentHotel = await Hotel.findById(req.user.hotel._id);
  if (!currentHotel)
    return res.status(404).json({ message: "Hotel not found" });
  const phone = req.body.phone ?? currentHotel.phone;
  const phoneCountryCode =
    req.body.phoneCountryCode ?? currentHotel.phoneCountryCode ?? "+91";
  const phoneChanged =
    req.body.phone !== undefined &&
    req.body.phone !== currentHotel.phone;
  const countryCodeChanged =
    req.body.phoneCountryCode !== undefined &&
    req.body.phoneCountryCode !==
      (currentHotel.phoneCountryCode || "+91");
  if (
    (phoneChanged || countryCodeChanged) &&
    !isValidPhone(phone, phoneCountryCode)
  )
    return res.status(400).json({
      message: "Enter a valid country code and a 10-digit phone number",
    });
  const updates = {};
  for (const field of [
    "name",
    "phone",
    "phoneCountryCode",
    "address",
    "city",
    "country",
    "gstin",
  ]) {
    if (typeof req.body[field] === "string")
      updates[field] =
        field === "gstin"
          ? req.body[field].trim().toUpperCase()
          : req.body[field].trim();
  }
  if (req.body.gstRate !== undefined) {
    const gstRate = Number(req.body.gstRate);
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100)
      return res.status(400).json({ message: "GST rate must be between 0 and 100" });
    updates.gstRate = gstRate;
  }
  for (const [field, maximum, label] of [
    ["cancellationCutoffHours", 8760, "Cancellation cutoff"],
    ["cancellationRefundPercent", 100, "Cancellation refund percentage"],
  ]) {
    if (req.body[field] === undefined) continue;
    const value = Number(req.body[field]);
    if (!Number.isFinite(value) || value < 0 || value > maximum)
      return res.status(400).json({
        message: `${label} must be between 0 and ${maximum}`,
      });
    updates[field] = value;
  }
  const hotel = await Hotel.findByIdAndUpdate(req.user.hotel._id, updates, {
    new: true,
    runValidators: true,
  });
  res.json({ hotel });
}

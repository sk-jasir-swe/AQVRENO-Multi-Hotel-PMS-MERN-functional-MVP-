import Hotel from "../models/Hotel.js";
import { isValidPhone } from "../utils/phone.js";

export async function hotelSettings(req, res) {
  const hotel = await Hotel.findById(req.user.hotel._id).select(
    "name email phone phoneCountryCode address city country gstin gstRate cancellationCutoffHours cancellationRefundPercent",
  );
  res.json({ hotel });
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

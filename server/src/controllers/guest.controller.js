import Booking from "../models/Booking.js";
import Guest from "../models/Guest.js";
import { isValidPhone } from "../utils/phone.js";
import {
  encryptGovernmentId,
  normalizeGovernmentId,
} from "../utils/governmentId.js";
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + DAY_MS);
  return { start, end };
}

function dateRangeForPeriod(period) {
  const localToday = new Date(Date.now() + IST_OFFSET_MS);
  localToday.setUTCHours(0, 0, 0, 0);
  if (period === "week")
    localToday.setUTCDate(
      localToday.getUTCDate() - ((localToday.getUTCDay() + 6) % 7),
    );
  if (period === "month") localToday.setUTCDate(1);
  const start = new Date(localToday.getTime() - IST_OFFSET_MS);
  if (period === "today") return { start, end: new Date(start.getTime() + DAY_MS) };
  if (period === "week") return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
  if (period === "month") {
    const days = new Date(
      Date.UTC(localToday.getUTCFullYear(), localToday.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return { start, end: new Date(start.getTime() + days * DAY_MS) };
  }
  return null;
}

export async function list(req, res) {
  const { period } = req.query;
  let dateRange;
  if (period === "custom") dateRange = customDateRange(req.query.from, req.query.to);
  else if (["today", "week", "month"].includes(period))
    dateRange = dateRangeForPeriod(period);
  else if (period && period !== "all")
    return res.status(400).json({ message: "Invalid guest date filter" });
  if (period && period !== "all" && !dateRange)
    return res.status(400).json({
      message: "Choose a valid date range with start date on or before end date",
    });
  const query = { hotel: req.user.hotel._id };
  if (dateRange) query.createdAt = { $gte: dateRange.start, $lt: dateRange.end };
  if (req.query.excludeCheckedIn === "true") {
    const checkedInGuests = await Booking.distinct("guest", {
      hotel: query.hotel,
      status: "checked_in",
    });
    query._id = { $nin: checkedInGuests };
  }
  const guests = await Guest.find(query)
    .sort({ createdAt: -1 })
    .limit(250);
  res.json({ items: guests });
}

export async function create(req, res) {
  const { name, gender, phone, phoneCountryCode = "+91" } = req.body;
  if (typeof name !== "string" || !name.trim())
    return res.status(400).json({ message: "Guest name is required" });
  if (!["male", "female"].includes(gender))
    return res.status(400).json({ message: "Select a valid guest gender" });
  if (!isValidPhone(phone, phoneCountryCode))
    return res.status(400).json({
      message: "Enter a valid country code and a 10-digit phone number",
    });
  const { governmentIdType, governmentIdNumber, governmentIdConsent } = req.body;
  const normalizedIdNumber = normalizeGovernmentId(
    governmentIdType,
    governmentIdNumber,
  );
  if (!normalizedIdNumber)
    return res.status(400).json({
      message: "Enter a valid Aadhaar, PAN or passport number",
    });
  if (governmentIdConsent !== true)
    return res.status(400).json({
      message: "Guest consent is required to store a government ID number",
    });
  const guest = await Guest.create({
    hotel: req.user.hotel._id,
    name: name.trim(),
    gender,
    email: req.body.email,
    phone,
    phoneCountryCode,
    address: req.body.address,
    governmentIdType,
    governmentIdNumberEncrypted: encryptGovernmentId(normalizedIdNumber),
    governmentIdConsentAt: new Date(),
    notes: req.body.notes,
    smsConsent: Boolean(req.body.smsConsent),
    source:
      typeof req.body.source === "string" && req.body.source.trim()
        ? req.body.source.trim()
        : "Walk-in",
    additionalGuests: Array.isArray(req.body.additionalGuests)
      ? req.body.additionalGuests
          .filter((name) => typeof name === "string")
          .map((name) => name.trim())
          .filter(Boolean)
      : [],
    active: true,
  });
  const item = guest.toObject();
  delete item.governmentIdNumberEncrypted;
  res.status(201).json({ item });
}

export async function guestHistory(req, res) {
  const hotel = req.user.hotel._id;
  const guest = await Guest.findOne({ _id: req.params.id, hotel });
  if (!guest) return res.status(404).json({ message: "Guest not found" });
  const bookings = await Booking.find({ hotel, guest: guest._id })
    .sort({ checkIn: -1 })
    .populate("room");
  res.json({ guest, bookings });
}

export async function update(req, res) {
  const hotel = req.user.hotel._id;
  const existingGuest = await Guest.findOne({ _id: req.params.id, hotel });
  if (!existingGuest)
    return res.status(404).json({ message: "Guest not found" });
  const phone = req.body.phone ?? existingGuest.phone;
  const phoneCountryCode =
    req.body.phoneCountryCode ??
    existingGuest.phoneCountryCode ??
    "+91";
  if (
    (req.body.phone !== undefined ||
      req.body.phoneCountryCode !== undefined) &&
    !isValidPhone(phone, phoneCountryCode)
  )
    return res.status(400).json({
      message: "Enter a valid country code and a 10-digit phone number",
    });
  if (req.body.active === false) {
    const activeBooking = await Booking.exists({
      hotel,
      guest: req.params.id,
      status: "checked_in",
    });
    if (activeBooking)
      return res.status(409).json({
        message: "Guest cannot be deactivated while checked into the hotel",
      });
  }
  const updates = { ...req.body };
  delete updates.hotel;
  delete updates._id;
  if (
    "governmentIdType" in updates ||
    "governmentIdNumber" in updates ||
    "governmentIdNumberEncrypted" in updates ||
    "governmentIdConsent" in updates ||
    "governmentIdConsentAt" in updates
  )
    return res.status(400).json({
      message: "Government ID details can only be recorded when creating a guest",
    });
  const guest = await Guest.findOneAndUpdate(
    { _id: req.params.id, hotel },
    updates,
    { new: true, runValidators: true },
  );
  if (!guest) return res.status(404).json({ message: "Guest not found" });
  res.json({ item: guest });
}

export async function remove(req, res) {
  const hotel = req.user.hotel._id;
  const guest = await Guest.findOne({ _id: req.params.id, hotel });
  if (!guest) return res.status(404).json({ message: "Guest not found" });
  const hasBookings = await Booking.exists({ hotel, guest: guest._id });
  if (hasBookings)
    return res.status(409).json({
      message: "Guests with reservation history cannot be deleted",
    });
  await guest.deleteOne();
  res.json({ message: "Deleted" });
}

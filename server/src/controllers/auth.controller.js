import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Hotel from "../models/Hotel.js";
import { isValidPhone } from "../utils/phone.js";
import {
  normalizeGmailAddress,
  passwordValidationError,
} from "../utils/accountValidation.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

function issue(res, user) {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  res.cookie("staypro_token", token, cookieOptions());
}

const safe = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  hotel: user.hotel
    ? { id: user.hotel._id, name: user.hotel.name, status: user.hotel.status }
    : null,
});

export async function register(req, res) {
  const {
    name,
    email,
    password,
    hotelName,
    address,
    phone,
    phoneCountryCode = "+91",
    city,
    gstin,
  } = req.body;
  const normalizedEmail = normalizeGmailAddress(email);
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password ||
    typeof hotelName !== "string" ||
    !hotelName.trim() ||
    typeof address !== "string" ||
    !address.trim()
  )
    return res
      .status(400)
      .json({
        message: "Name, email, password, hotel name and hotel address are required",
      });
  if (!normalizedEmail)
    return res.status(400).json({
      message: "Use a valid Gmail address ending in @gmail.com",
    });
  const passwordError = passwordValidationError(password);
  if (passwordError) return res.status(400).json({ message: passwordError });
  if (!isValidPhone(phone, phoneCountryCode))
    return res.status(400).json({
      message: "Enter a valid country code and a 10-digit phone number",
    });
  if (await User.findOne({ email: normalizedEmail }))
    return res.status(409).json({ message: "Email already registered" });
  const hotel = await Hotel.create({
    name: hotelName,
    address: address.trim(),
    phone,
    phoneCountryCode,
    city,
    email: normalizedEmail,
    gstin: typeof gstin === "string" ? gstin.trim().toUpperCase() : "",
  });
  try {
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      hotel: hotel._id,
      role: "hotel_owner",
    });
    user.hotel = hotel;
    issue(res, user);
    res.status(201).json({
      user: safe(user),
      message: "Registration complete. Your hotel is pending approval.",
    });
  } catch (error) {
    await Hotel.findByIdAndDelete(hotel._id);
    throw error;
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const user = await User.findOne({ email: normalizedEmail })
    .select("+password")
    .populate("hotel");
  if (!user || !(await bcrypt.compare(password || "", user.password)))
    return res.status(401).json({ message: "Invalid email or password" });
  if (!user.active)
    return res.status(403).json({ message: "Account disabled" });
  issue(res, user);
  res.json({ user: safe(user) });
}

export function logout(req, res) {
  res.clearCookie("staypro_token", { ...cookieOptions(), maxAge: undefined });
  res.json({ message: "Logged out" });
}

export function me(req, res) {
  res.json({ user: safe(req.user) });
}

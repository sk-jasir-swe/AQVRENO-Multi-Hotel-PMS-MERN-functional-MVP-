import { env } from "./config/env.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;
if (!email || !password) {
  throw new Error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD");
}

try {
  await mongoose.connect(env.mongoUri);
  const user = await User.findOne({ email }).select("+password");
  const passwordHash = await bcrypt.hash(password, 12);

  if (user) {
    user.name = process.env.SUPER_ADMIN_NAME || "StayPro Admin";
    user.password = passwordHash;
    user.role = "super_admin";
    user.active = true;
    await user.save();
    console.log("Super admin credentials updated");
  } else {
    await User.create({
      name: process.env.SUPER_ADMIN_NAME || "StayPro Admin",
      email,
      password: passwordHash,
      role: "super_admin",
    });
    console.log("Super admin created");
  }
} finally {
  await mongoose.disconnect();
}

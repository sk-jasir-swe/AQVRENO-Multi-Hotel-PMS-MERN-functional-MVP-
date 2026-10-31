import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [
        "super_admin",
        "hotel_owner",
        "hotel_manager",
        "receptionist",
        "housekeeping",
        "restaurant_staff",
      ],
      default: "hotel_owner",
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export default mongoose.model("User", userSchema);

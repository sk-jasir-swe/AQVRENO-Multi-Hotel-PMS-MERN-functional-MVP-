import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    number: { type: String, required: true },
    type: { type: String, default: "Standard" },
    floor: { type: String, default: "Ground" },
    capacity: { type: Number, default: 2, min: 1 },
    airConditioning: { type: Boolean, default: false },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["available", "occupied", "cleaning", "maintenance"],
      default: "available",
    },
    bookingLockId: { type: String, select: false },
    bookingLockExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);
schema.index({ hotel: 1, number: 1 }, { unique: true });
export default mongoose.model("Room", schema);

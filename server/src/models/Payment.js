import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    method: {
      type: String,
      enum: ["cash", "card", "upi", "bank_transfer", "gateway"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["pending", "captured", "failed", "refunded"],
      default: "pending",
    },
    reference: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    refundedAt: Date,
    refundAmount: { type: Number, min: 0, default: 0 },
    refunds: [
      {
        amount: { type: Number, required: true, min: 0 },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        refundedAt: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true },
);
schema.index({ hotel: 1, booking: 1, status: 1 });
export default mongoose.model("Payment", schema);

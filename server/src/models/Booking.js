import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    adults: { type: Number, default: 1 },
    nightlyRate: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "refunded"],
      default: "pending",
    },
    paidAt: Date,
    checkedInAt: Date,
    checkedOutAt: Date,
    cancelledAt: Date,
    noShowAt: Date,
    noShowRefundPercent: { type: Number, min: 0, max: 100 },
    noShowRefundEligible: { type: Number, min: 0 },
    identityDocumentType: {
      type: String,
      enum: ["passport", "drivers_license", "national_id", "other"],
    },
    identityLast4: { type: String, match: /^\d{4}$/ },
    identityVerifiedAt: Date,
    identityConsentAt: Date,
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    cancellationRefundPercent: { type: Number, min: 0, max: 100 },
    cancellationRefundEligible: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["confirmed", "checked_in", "checked_out", "cancelled", "no_show"],
      default: "confirmed",
    },
    source: { type: String, default: "Walk-in" },
  },
  { timestamps: true },
);
schema.index({ hotel: 1, room: 1, checkIn: 1, checkOut: 1 });
export default mongoose.model("Booking", schema);

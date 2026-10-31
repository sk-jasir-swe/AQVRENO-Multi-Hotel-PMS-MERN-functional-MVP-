import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },
    type: { type: String, required: true },
    channel: {
      type: String,
      enum: ["in_app", "email", "sms"],
      default: "in_app",
    },
    subject: String,
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "sent", "failed", "read"],
      default: "queued",
    },
    readAt: Date,
    sentAt: Date,
    scheduledFor: Date,
    dedupeKey: { type: String, sparse: true, unique: true },
    error: String,
  },
  { timestamps: true },
);
schema.index({ hotel: 1, user: 1, createdAt: -1 });

export default mongoose.model("Notification", schema);

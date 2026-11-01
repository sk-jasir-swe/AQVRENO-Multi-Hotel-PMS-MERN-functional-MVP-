import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["scheduled", "cancelled"],
      default: "scheduled",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cancelledAt: Date,
  },
  { timestamps: true },
);

schema.index({ hotel: 1, room: 1, status: 1, startDate: 1, endDate: 1 });
export default mongoose.model("MaintenanceBlock", schema);

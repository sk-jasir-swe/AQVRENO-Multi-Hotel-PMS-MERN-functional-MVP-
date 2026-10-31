import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    task: { type: String, default: "cleaning" },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "inspected"],
      default: "pending",
    },
    notes: String,
    dueAt: Date,
  },
  { timestamps: true },
);
export default mongoose.model("Housekeeping", schema);

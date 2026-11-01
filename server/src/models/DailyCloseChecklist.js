import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    dateKey: { type: String, required: true },
    arrivalsReviewed: { type: Boolean, default: false },
    departuresReviewed: { type: Boolean, default: false },
    paymentsReviewed: { type: Boolean, default: false },
    roomTasksReviewed: { type: Boolean, default: false },
    closedAt: Date,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

schema.index({ hotel: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("DailyCloseChecklist", schema);

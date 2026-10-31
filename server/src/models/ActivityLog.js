import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, maxlength: 100 },
    entity: { type: String, required: true, maxlength: 80 },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

schema.index({ hotel: 1, createdAt: -1 });
export default mongoose.model("ActivityLog", schema);

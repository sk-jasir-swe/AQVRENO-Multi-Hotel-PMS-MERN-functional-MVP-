import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: String,
    capacity: { type: Number, default: 2, min: 1 },
    basePrice: { type: Number, required: true, min: 0 },
    amenities: [String],
  },
  { timestamps: true },
);
schema.index({ hotel: 1, name: 1 }, { unique: true });
export default mongoose.model("RoomType", schema);

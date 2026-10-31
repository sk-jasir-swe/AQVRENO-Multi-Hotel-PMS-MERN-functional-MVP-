import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    priceMonthly: { type: Number, required: true, min: 0 },
    priceYearly: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    limits: { properties: Number, rooms: Number, staff: Number },
    features: [String],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export default mongoose.model("Plan", schema);

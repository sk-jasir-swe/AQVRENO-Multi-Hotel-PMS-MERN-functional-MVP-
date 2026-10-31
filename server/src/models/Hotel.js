import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    phoneCountryCode: { type: String, default: "+91" },
    address: String,
    city: String,
    country: { type: String, default: "India" },
    gstin: { type: String, trim: true, default: "" },
    gstRate: { type: Number, min: 0, max: 100, default: 0 },
    restaurantGstRate: { type: Number, min: 0, max: 100, default: 0 },
    cancellationCutoffHours: { type: Number, min: 0, max: 8760, default: 24 },
    cancellationRefundPercent: { type: Number, min: 0, max: 100, default: 100 },
    invoiceSequence: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "pending",
    },
    timezone: { type: String, default: "Asia/Kolkata" },
  },
  { timestamps: true },
);
export default mongoose.model("Hotel", schema);

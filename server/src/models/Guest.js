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
    gender: { type: String, enum: ["male", "female"] },
    email: String,
    phone: String,
    phoneCountryCode: { type: String, default: "+91" },
    address: String,
    governmentIdType: {
      type: String,
      enum: ["aadhaar", "pan", "passport"],
    },
    governmentIdNumberEncrypted: { type: String, select: false },
    governmentIdConsentAt: Date,
    active: { type: Boolean, default: true },
    smsConsent: { type: Boolean, default: false },
    source: { type: String, trim: true, default: "Walk-in" },
    additionalGuests: [{ type: String, trim: true }],
    notes: String,
  },
  { timestamps: true },
);
export default mongoose.model("Guest", schema);

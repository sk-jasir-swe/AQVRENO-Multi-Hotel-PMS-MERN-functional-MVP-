import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "cancelled", "expired"],
      default: "trialing",
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "past_due", "refunded"],
      default: "pending",
    },
    lastPaymentAt: Date,
    gatewaySubscriptionId: String,
  },
  { timestamps: true },
);
export default mongoose.model("Subscription", schema);

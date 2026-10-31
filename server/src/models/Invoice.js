import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },
    number: { type: String, required: true },
    lineItems: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        taxRate: Number,
        amount: Number,
      },
    ],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    gstin: String,
    status: {
      type: String,
      enum: ["draft", "issued", "paid", "void"],
      default: "draft",
    },
  },
  { timestamps: true },
);
schema.index({ hotel: 1, number: 1 }, { unique: true });
export default mongoose.model("Invoice", schema);

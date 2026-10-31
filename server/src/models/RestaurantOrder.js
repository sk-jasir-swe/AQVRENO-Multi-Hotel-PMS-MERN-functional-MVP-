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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    serviceType: { type: String, enum: ["table", "room"], default: "table" },
    table: String,
    items: [
      {
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
        name: String,
        quantity: Number,
        unitPrice: Number,
        notes: String,
      },
    ],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxRate: { type: Number, min: 0, max: 100 },
    total: { type: Number, default: 0 },
    servedAt: Date,
    status: {
      type: String,
      enum: ["new", "preparing", "ready", "served", "cancelled"],
      default: "new",
    },
  },
  { timestamps: true },
);
schema.index({ hotel: 1, status: 1, servedAt: 1 });
export default mongoose.model("RestaurantOrder", schema);

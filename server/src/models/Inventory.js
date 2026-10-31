import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    sku: String,
    category: String,
    unit: { type: String, default: "unit" },
    quantity: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    supplier: String,
  },
  { timestamps: true },
);
schema.index({ hotel: 1, sku: 1 }, { unique: true, sparse: true });
export default mongoose.model("Inventory", schema);

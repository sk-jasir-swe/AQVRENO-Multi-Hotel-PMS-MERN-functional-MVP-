import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: { type: String, required: true },
    refreshTokenHash: { type: String, required: true },
    userType: {
      type: String,
      enum: [
        "super_admin",
        "hotel_owner",
        "hotel_manager",
        "receptionist",
        "housekeeping",
        "restaurant_staff",
      ],
      required: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revoked: { type: Boolean, default: false, index: true },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ userId: 1, revoked: 1, expiresAt: 1 });
schema.index(
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: "string" } } },
);

export default mongoose.model("RefreshSession", schema);

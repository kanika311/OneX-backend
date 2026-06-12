import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    cartKey: { type: String, required: true },
    offeringId: { type: String, default: "" },
    type: { type: String, enum: ["course", "service", "membership"], required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    image: { type: String, default: "" },
    duration: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    customerPhone: { type: String, default: "", trim: true },
    items: { type: [orderItemSchema], required: true },
    lineSubtotal: { type: Number, min: 0 },
    promoCode: { type: String, default: "" },
    discountPercent: { type: Number, default: 0, min: 0, max: 5 },
    discountAmount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["awaiting", "submitted", "confirmed"],
      default: "awaiting",
    },
    paymentSubmittedAt: { type: Date, default: null },
    paymentReference: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

orderSchema.index({ customerEmail: 1, createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);

import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    description: { type: String, required: true },
    discountLabel: { type: String, default: "" },
    discountPercent: { type: Number, default: 0 },
    promoCode: { type: String, default: "" },
    image: { type: String, default: "" },
    ctaText: { type: String, default: "Claim offer" },
    ctaLink: { type: String, default: "/contact" },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Offer = mongoose.model("Offer", offerSchema);

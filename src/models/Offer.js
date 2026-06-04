import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    offerType: { type: String, enum: ["membership", "promo"], default: "membership" },
    /** Tier name shown on card, e.g. Silver, Gold, Diamond */
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    description: { type: String, default: "", required: false },
    /** Inner card heading, e.g. Founding Member */
    cardTitle: { type: String, default: "Founding Member" },
    price: { type: Number, default: 0 },
    /** WhatsApp / call number shown on gift card CTA */
    contactPhone: { type: String, default: "" },
    feeLabel: { type: String, default: "One-time fee" },
    benefits: { type: [String], default: [] },
    discountLabel: { type: String, default: "" },
    discountPercent: { type: Number, default: 0 },
    promoCode: { type: String, default: "" },
    image: { type: String, default: "" },
    ctaText: { type: String, default: "Get Your Membership Card" },
    ctaLink: { type: String, default: "/contact" },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Offer = mongoose.model("Offer", offerSchema);

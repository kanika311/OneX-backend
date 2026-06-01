import mongoose from "mongoose";

const faqSchema = new mongoose.Schema({ q: String, a: String }, { _id: false });

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, trim: true },
    domain: { type: String, enum: ["cyber", "physio"], required: true },
    category: { type: String, enum: ["courses", "services", "therapy"], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    duration: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    image: { type: String, required: true },
    iconKey: { type: String, required: true, default: "shield" },
    bestseller: { type: Boolean, default: false },
    benefits: [{ type: String }],
    faq: [faqSchema],
    cta: { type: String, default: "Book now" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ domain: 1, category: 1, slug: 1 }, { unique: true });
productSchema.index({ title: "text", description: "text" });

productSchema.virtual("offeringId").get(function offeringId() {
  return `${this.domain}/${this.category}/${this.slug}`;
});

productSchema.set("toJSON", { virtuals: true });

export const Product = mongoose.model("Product", productSchema);

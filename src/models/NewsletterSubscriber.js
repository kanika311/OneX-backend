import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 200 },
    source: { type: String, default: "footer", trim: true },
  },
  { timestamps: true },
);

newsletterSubscriberSchema.index({ createdAt: -1 });

export const NewsletterSubscriber = mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);

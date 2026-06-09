import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    photo: { type: String, default: "" },
    serviceUsed: { type: String, required: true, trim: true, maxlength: 200 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    serviceDate: { type: Date, required: true },
    consent: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

testimonialSchema.index({ createdAt: -1 });

export const Testimonial = mongoose.model("Testimonial", testimonialSchema);

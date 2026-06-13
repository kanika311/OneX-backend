import mongoose from "mongoose";

const cookieConsentSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, trim: true, unique: true, maxlength: 64 },
    pageUrl: { type: String, default: "", trim: true, maxlength: 500 },
    referrer: { type: String, default: "", trim: true, maxlength: 500 },
    userAgent: { type: String, default: "", trim: true, maxlength: 500 },
    ipAddress: { type: String, default: "", trim: true, maxlength: 64 },
  },
  { timestamps: true },
);

cookieConsentSchema.index({ createdAt: -1 });

export const CookieConsent = mongoose.model("CookieConsent", cookieConsentSchema);

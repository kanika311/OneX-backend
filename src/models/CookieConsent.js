import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema(
  {
    necessary: { type: Boolean, default: true },
    analytics: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false },
    functional: { type: Boolean, default: false },
  },
  { _id: false },
);

const pageVisitSchema = new mongoose.Schema(
  {
    url: { type: String, default: "", trim: true, maxlength: 500 },
    visitedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const historyEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["accepted", "rejected", "customized"], default: "accepted" },
    preferences: { type: preferencesSchema, default: () => ({}) },
    policyVersion: { type: String, default: "1.0", trim: true, maxlength: 32 },
    pageUrl: { type: String, default: "", trim: true, maxlength: 500 },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const cookieConsentSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, trim: true, unique: true, maxlength: 64 },
    status: { type: String, enum: ["accepted", "rejected", "customized"], default: "accepted" },
    pageUrl: { type: String, default: "", trim: true, maxlength: 500 },
    referrer: { type: String, default: "", trim: true, maxlength: 500 },
    userAgent: { type: String, default: "", trim: true, maxlength: 500 },
    ipAddress: { type: String, default: "", trim: true, maxlength: 64 },
    deviceType: { type: String, enum: ["mobile", "desktop", "tablet", "unknown"], default: "unknown" },
    browser: { type: String, default: "", trim: true, maxlength: 64 },
    country: { type: String, default: "", trim: true, maxlength: 64 },
    policyVersion: { type: String, default: "1.0", trim: true, maxlength: 32 },
    preferences: { type: preferencesSchema, default: () => ({ necessary: true }) },
    pagesBeforeConsent: { type: [pageVisitSchema], default: [] },
    history: { type: [historyEntrySchema], default: [] },
  },
  { timestamps: true },
);

cookieConsentSchema.index({ createdAt: -1 });
cookieConsentSchema.index({ updatedAt: -1 });
cookieConsentSchema.index({ status: 1 });
cookieConsentSchema.index({ deviceType: 1 });
cookieConsentSchema.index({ country: 1 });
cookieConsentSchema.index({ policyVersion: 1 });

export const CookieConsent = mongoose.model("CookieConsent", cookieConsentSchema);

import mongoose from "mongoose";

const versionHistorySchema = new mongoose.Schema(
  {
    version: { type: String, required: true, trim: true, maxlength: 32 },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    publishedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const categorySchema = new mongoose.Schema(
  {
    necessary: { type: Boolean, default: true },
    analytics: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
    functional: { type: Boolean, default: true },
  },
  { _id: false },
);

const cookiePolicySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    currentVersion: { type: String, default: "1.0", trim: true, maxlength: 32 },
    categories: { type: categorySchema, default: () => ({}) },
    versionHistory: { type: [versionHistorySchema], default: [] },
  },
  { timestamps: true },
);

export const CookiePolicySettings = mongoose.model("CookiePolicySettings", cookiePolicySettingsSchema);

export async function getOrCreateCookiePolicySettings() {
  let doc = await CookiePolicySettings.findOne({ key: "default" });
  if (!doc) {
    doc = await CookiePolicySettings.create({
      key: "default",
      currentVersion: "1.0",
      versionHistory: [{ version: "1.0", note: "Initial cookie policy", publishedAt: new Date() }],
    });
  }
  return doc;
}

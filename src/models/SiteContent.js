import mongoose from "mongoose";

const legalSectionSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "" },
    body: { type: String, default: "" },
  },
  { _id: false },
);

const legalDocSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    intro: { type: String, default: "" },
    sections: { type: [legalSectionSchema], default: [] },
  },
  { _id: false },
);

const contactSchema = new mongoose.Schema(
  {
    headline: { type: String, default: "" },
    subheadline: { type: String, default: "" },
    address: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    linkedin: { type: String, default: "" },
  },
  { _id: false },
);

const siteContentSchema = new mongoose.Schema(
  {
    /** singleton key */
    key: { type: String, default: "default", unique: true },
    contact: { type: contactSchema, default: () => ({}) },
    privacy: { type: legalDocSchema, default: () => ({}) },
    terms: { type: legalDocSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const SiteContent = mongoose.model("SiteContent", siteContentSchema);


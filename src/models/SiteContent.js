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

const aboutSchema = new mongoose.Schema(
  {
    storyParagraph1: { type: String, default: "" },
    storyParagraph2: { type: String, default: "" },
    visionTitle: { type: String, default: "Vision" },
    visionText: { type: String, default: "" },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    upiId: { type: String, default: "" },
    upiPayeeName: { type: String, default: "" },
    qrImage: { type: String, default: "" },
  },
  { _id: false },
);

const siteContentSchema = new mongoose.Schema(
  {
    /** singleton key */
    key: { type: String, default: "default", unique: true },
    about: { type: aboutSchema, default: () => ({}) },
    contact: { type: contactSchema, default: () => ({}) },
    payment: { type: paymentSchema, default: () => ({}) },
    privacy: { type: legalDocSchema, default: () => ({}) },
    terms: { type: legalDocSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const SiteContent = mongoose.model("SiteContent", siteContentSchema);


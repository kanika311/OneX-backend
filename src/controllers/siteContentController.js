import { SiteContent } from "../models/SiteContent.js";

function safeString(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalizeLegal(doc) {
  if (!doc || typeof doc !== "object") return { title: "", intro: "", sections: [] };
  const sections = Array.isArray(doc.sections) ? doc.sections : [];
  return {
    title: safeString(doc.title),
    intro: safeString(doc.intro),
    sections: sections
      .map((s) => ({ heading: safeString(s?.heading), body: safeString(s?.body) }))
      .filter((s) => s.heading || s.body),
  };
}

function normalizeContact(contact) {
  if (!contact || typeof contact !== "object") return {};
  return {
    headline: safeString(contact.headline),
    subheadline: safeString(contact.subheadline),
    address: safeString(contact.address),
    email: safeString(contact.email),
    phone: safeString(contact.phone),
    whatsapp: safeString(contact.whatsapp),
    linkedin: safeString(contact.linkedin),
  };
}

function normalizeAbout(about) {
  if (!about || typeof about !== "object") return {};
  return {
    storyParagraph1: safeString(about.storyParagraph1),
    storyParagraph2: safeString(about.storyParagraph2),
    visionTitle: safeString(about.visionTitle) || "Vision",
    visionText: safeString(about.visionText),
  };
}

function normalizePayment(payment) {
  if (!payment || typeof payment !== "object") return {};
  return {
    upiId: safeString(payment.upiId),
    upiPayeeName: safeString(payment.upiPayeeName),
    qrImage: safeString(payment.qrImage),
  };
}

export async function getSiteContent(_req, res) {
  const doc = await SiteContent.findOne({ key: "default" }).lean();
  res.json({ success: true, content: doc || null });
}

export async function upsertSiteContent(req, res) {
  const body = req.body || {};

  const update = {
    about: normalizeAbout(body.about),
    contact: normalizeContact(body.contact),
    payment: normalizePayment(body.payment),
    privacy: normalizeLegal(body.privacy),
    terms: normalizeLegal(body.terms),
  };

  const doc = await SiteContent.findOneAndUpdate(
    { key: "default" },
    { $set: update, $setOnInsert: { key: "default" } },
    { new: true, upsert: true },
  ).lean();

  res.json({ success: true, content: doc });
}


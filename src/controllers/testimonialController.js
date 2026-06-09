import mongoose from "mongoose";
import { Testimonial } from "../models/Testimonial.js";
import { ApiError } from "../utils/helpers.js";
import { normalizeImageForStorage, resolveMediaUrl } from "../utils/mediaUrl.js";

function formatTestimonial(doc, req) {
  const t = doc.toObject ? doc.toObject() : { ...doc };
  if (t.photo) t.photo = resolveMediaUrl(t.photo, req);
  return t;
}

function parseRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n);
}

function parseServiceDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  if (d > now) return null;
  return d;
}

async function findTestimonial(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(404, "Testimonial not found");
  const item = await Testimonial.findById(id);
  if (!item) throw new ApiError(404, "Testimonial not found");
  return item;
}

export async function listTestimonials(req, res) {
  const isAdmin = req.user?.role === "admin";
  const { status, featured, limit = 50, page = 1 } = req.query;

  const filter = {};
  if (isAdmin) {
    if (status && status !== "all") filter.status = status;
  } else {
    filter.status = "approved";
  }
  if (featured === "true") filter.featured = true;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Testimonial.find(filter).sort({ featured: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
    Testimonial.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    testimonials: items.map((t) => formatTestimonial(t, req)),
  });
}

export async function submitTestimonial(req, res) {
  const fullName = String(req.body.fullName ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const serviceUsed = String(req.body.serviceUsed ?? "").trim();
  const message = String(req.body.message ?? "").trim();
  const rating = parseRating(req.body.rating);
  const serviceDate = parseServiceDate(req.body.serviceDate);
  const consent = req.body.consent === true || req.body.consent === "true" || req.body.consent === "on";

  if (!fullName) throw new ApiError(400, "Full name is required");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Valid email is required");
  if (!serviceUsed) throw new ApiError(400, "Service used is required");
  if (!rating) throw new ApiError(400, "Rating must be between 1 and 5");
  if (!message || message.length < 20) throw new ApiError(400, "Testimonial must be at least 20 characters");
  if (!serviceDate) throw new ApiError(400, "Valid date of service is required");
  if (!consent) throw new ApiError(400, "You must confirm this testimonial is based on your genuine experience");

  let photo = "";
  if (req.file) {
    photo = normalizeImageForStorage(`/uploads/${req.file.filename}`);
  }

  const testimonial = await Testimonial.create({
    fullName,
    email,
    photo,
    serviceUsed,
    rating,
    message,
    serviceDate,
    consent: true,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Thank you! Your testimonial has been submitted and will appear after review.",
    testimonial: formatTestimonial(testimonial, req),
  });
}

export async function updateTestimonial(req, res) {
  const testimonial = await findTestimonial(req.params.id);
  const { status, featured } = req.body;

  if (status !== undefined) {
    if (!["pending", "approved", "rejected"].includes(status)) {
      throw new ApiError(400, "Invalid status");
    }
    testimonial.status = status;
  }
  if (featured !== undefined) testimonial.featured = Boolean(featured);

  await testimonial.save();
  res.json({ success: true, testimonial: formatTestimonial(testimonial, req) });
}

export async function deleteTestimonial(req, res) {
  const testimonial = await findTestimonial(req.params.id);
  await testimonial.deleteOne();
  res.json({ success: true, message: "Testimonial deleted" });
}

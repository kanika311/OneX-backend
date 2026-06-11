import mongoose from "mongoose";
import { ContactInquiry } from "../models/ContactInquiry.js";
import { ApiError } from "../utils/helpers.js";

async function findInquiry(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(404, "Inquiry not found");
  const item = await ContactInquiry.findById(id);
  if (!item) throw new ApiError(404, "Inquiry not found");
  return item;
}

export async function submitContactInquiry(req, res) {
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const phone = String(req.body.phone ?? "").trim();
  const message = String(req.body.message ?? "").trim();

  if (!name) throw new ApiError(400, "Name is required");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "Valid email is required");
  }
  if (!message || message.length < 3) {
    throw new ApiError(400, "Please enter a message");
  }

  const inquiry = await ContactInquiry.create({
    name,
    email,
    phone,
    message,
    status: "new",
  });

  res.status(201).json({
    success: true,
    message: "Thank you — we will respond within 24 hours.",
    inquiry: inquiry.toObject(),
  });
}

export async function listContactInquiries(req, res) {
  const { status, limit = 100, page = 1 } = req.query;
  const filter = {};
  if (status && status !== "all") filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    ContactInquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    ContactInquiry.countDocuments(filter),
  ]);

  res.json({ success: true, total, inquiries: items });
}

export async function updateContactInquiry(req, res) {
  const inquiry = await findInquiry(req.params.id);
  const { status } = req.body;

  if (status !== undefined) {
    if (!["new", "read", "replied", "archived"].includes(status)) {
      throw new ApiError(400, "Invalid status");
    }
    inquiry.status = status;
  }

  await inquiry.save();
  res.json({ success: true, inquiry });
}

export async function deleteContactInquiry(req, res) {
  const inquiry = await findInquiry(req.params.id);
  await inquiry.deleteOne();
  res.json({ success: true, message: "Inquiry deleted" });
}

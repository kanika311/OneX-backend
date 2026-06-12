import mongoose from "mongoose";
import { NewsletterSubscriber } from "../models/NewsletterSubscriber.js";
import { ApiError } from "../utils/helpers.js";

export async function subscribeNewsletter(req, res) {
  const email = String(req.body.email ?? "")
    .trim()
    .toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "Valid email is required");
  }

  await NewsletterSubscriber.findOneAndUpdate(
    { email },
    { email, source: String(req.body.source || "footer").trim() || "footer" },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({
    success: true,
    message: "Thank you — you're on the list.",
  });
}

export async function listNewsletterSubscribers(req, res) {
  const { limit = 200, page = 1 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    NewsletterSubscriber.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    NewsletterSubscriber.countDocuments(),
  ]);

  res.json({ success: true, total, subscribers: items });
}

export async function deleteNewsletterSubscriber(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(404, "Subscriber not found");
  }
  const item = await NewsletterSubscriber.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, "Subscriber not found");
  res.json({ success: true, message: "Removed from list" });
}

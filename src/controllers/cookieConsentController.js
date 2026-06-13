import mongoose from "mongoose";
import { CookieConsent } from "../models/CookieConsent.js";
import { ApiError } from "../utils/helpers.js";

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
}

export async function recordCookieConsent(req, res) {
  const visitorId = String(req.body.visitorId ?? "").trim();
  if (!visitorId || visitorId.length > 64) {
    throw new ApiError(400, "Invalid visitor id");
  }

  const doc = await CookieConsent.findOneAndUpdate(
    { visitorId },
    {
      visitorId,
      pageUrl: String(req.body.pageUrl ?? "").trim().slice(0, 500),
      referrer: String(req.body.referrer ?? "").trim().slice(0, 500),
      userAgent: String(req.body.userAgent ?? req.headers["user-agent"] ?? "").trim().slice(0, 500),
      ipAddress: clientIp(req).slice(0, 64),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({
    success: true,
    message: "Cookie preferences saved.",
    consent: { id: doc._id, visitorId: doc.visitorId, acceptedAt: doc.updatedAt },
  });
}

export async function listCookieConsents(req, res) {
  const { limit = 200, page = 1 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    CookieConsent.find().sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    CookieConsent.countDocuments(),
  ]);

  res.json({ success: true, total, consents: items });
}

export async function deleteCookieConsent(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(404, "Record not found");
  }
  const item = await CookieConsent.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, "Record not found");
  res.json({ success: true, message: "Removed" });
}

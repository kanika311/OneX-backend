import mongoose from "mongoose";
import { CookieConsent } from "../models/CookieConsent.js";
import { getOrCreateCookiePolicySettings } from "../models/CookiePolicySettings.js";
import {
  clientIp,
  detectCountry,
  normalizePreferences,
  normalizeStatus,
  parseBrowser,
  parseDeviceType,
} from "../utils/consent-meta.js";
import { ApiError } from "../utils/helpers.js";

function parsePagesBeforeConsent(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 50)
    .map((item) => ({
      url: String(item?.url ?? item ?? "").trim().slice(0, 500),
      visitedAt: item?.visitedAt ? new Date(item.visitedAt) : new Date(),
    }))
    .filter((p) => p.url);
}

function buildHistoryEntry({ status, preferences, policyVersion, pageUrl }) {
  return {
    status,
    preferences,
    policyVersion,
    pageUrl: String(pageUrl ?? "").trim().slice(0, 500),
    at: new Date(),
  };
}

function buildListFilter(query) {
  const filter = {};
  const { status, deviceType, country, dateFrom, dateTo, search, pageUrl } = query;

  if (status && status !== "all") filter.status = String(status);
  if (deviceType && deviceType !== "all") filter.deviceType = String(deviceType);
  if (country && country !== "all") filter.country = String(country).toUpperCase();
  if (pageUrl) filter.pageUrl = { $regex: String(pageUrl).trim().slice(0, 200), $options: "i" };

  if (dateFrom || dateTo) {
    filter.updatedAt = {};
    if (dateFrom) filter.updatedAt.$gte = new Date(String(dateFrom));
    if (dateTo) {
      const end = new Date(String(dateTo));
      end.setHours(23, 59, 59, 999);
      filter.updatedAt.$lte = end;
    }
  }

  if (search) {
    const term = String(search).trim().slice(0, 200);
    if (term) {
      filter.$or = [
        { ipAddress: { $regex: term, $options: "i" } },
        { pageUrl: { $regex: term, $options: "i" } },
        { visitorId: { $regex: term, $options: "i" } },
        { country: { $regex: term, $options: "i" } },
      ];
    }
  }

  return filter;
}

export async function recordCookieConsent(req, res) {
  const visitorId = String(req.body.visitorId ?? "").trim();
  if (!visitorId || visitorId.length > 64) {
    throw new ApiError(400, "Invalid visitor id");
  }

  const settings = await getOrCreateCookiePolicySettings();
  const userAgent = String(req.body.userAgent ?? req.headers["user-agent"] ?? "").trim().slice(0, 500);
  const status = normalizeStatus(req.body.status);
  const preferences = normalizePreferences(req.body.preferences, settings.categories);
  const policyVersion = String(settings.currentVersion || "1.0").slice(0, 32);
  const pageUrl = String(req.body.pageUrl ?? "").trim().slice(0, 500);
  const pagesBeforeConsent = parsePagesBeforeConsent(req.body.pagesBeforeConsent);

  const payload = {
    visitorId,
    status,
    pageUrl,
    referrer: String(req.body.referrer ?? "").trim().slice(0, 500),
    userAgent,
    ipAddress: clientIp(req).slice(0, 64),
    deviceType: parseDeviceType(userAgent),
    browser: parseBrowser(userAgent).slice(0, 64),
    country: detectCountry(req),
    policyVersion,
    preferences,
    pagesBeforeConsent,
  };

  const existing = await CookieConsent.findOne({ visitorId });
  const historyEntry = buildHistoryEntry({ status, preferences, policyVersion, pageUrl });

  let doc;
  if (existing) {
    existing.set(payload);
    existing.history = [...(existing.history || []), historyEntry].slice(-50);
    doc = await existing.save();
  } else {
    doc = await CookieConsent.create({ ...payload, history: [historyEntry] });
  }

  res.status(existing ? 200 : 201).json({
    success: true,
    message: "Cookie preferences saved.",
    consent: {
      id: doc._id,
      visitorId: doc.visitorId,
      status: doc.status,
      policyVersion: doc.policyVersion,
      updatedAt: doc.updatedAt,
    },
  });
}

export async function listCookieConsents(req, res) {
  const { limit = 200, page = 1 } = req.query;
  const filter = buildListFilter(req.query);
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    CookieConsent.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    CookieConsent.countDocuments(filter),
  ]);

  res.json({ success: true, total, consents: items });
}

export async function getCookieConsent(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(404, "Record not found");
  }
  const item = await CookieConsent.findById(req.params.id).lean();
  if (!item) throw new ApiError(404, "Record not found");
  res.json({ success: true, consent: item });
}

export async function getCookieConsentStats(req, res) {
  const filter = buildListFilter(req.query);
  const statusExpr = { $ifNull: ["$status", "accepted"] };

  const [totalVisitors, accepted, rejected, customized, consentChanges, dailyTrend, devices, versionBreakdown] =
    await Promise.all([
      CookieConsent.countDocuments(filter),
      CookieConsent.countDocuments({ ...filter, $or: [{ status: "accepted" }, { status: { $exists: false } }] }),
      CookieConsent.countDocuments({ ...filter, status: "rejected" }),
      CookieConsent.countDocuments({ ...filter, status: "customized" }),
      CookieConsent.aggregate([
        { $match: filter },
        { $project: { changes: { $max: [{ $subtract: [{ $size: { $ifNull: ["$history", []] } }, 1] }, 0] } } },
        { $group: { _id: null, total: { $sum: "$changes" } } },
      ]),
      CookieConsent.aggregate([
        { $match: filter },
        { $addFields: { effectiveStatus: statusExpr } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
            accepted: { $sum: { $cond: [{ $eq: ["$effectiveStatus", "accepted"] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ["$effectiveStatus", "rejected"] }, 1, 0] } },
            customized: { $sum: { $cond: [{ $eq: ["$effectiveStatus", "customized"] }, 1, 0] } },
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      CookieConsent.aggregate([
        { $match: filter },
        { $group: { _id: "$deviceType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      CookieConsent.aggregate([
        { $match: filter },
        { $group: { _id: "$policyVersion", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
    ]);

  const settings = await getOrCreateCookiePolicySettings();

  res.json({
    success: true,
    stats: {
      totalVisitors,
      accepted,
      rejected,
      customized,
      acceptanceRate: totalVisitors ? Math.round((accepted / totalVisitors) * 1000) / 10 : 0,
      consentChanges: consentChanges[0]?.total ?? 0,
      dailyTrend,
      devices: devices.map((d) => ({ device: d._id || "unknown", count: d.count })),
      versionBreakdown: versionBreakdown.map((v) => ({ version: v._id || "unknown", count: v.count })),
    },
    policy: {
      currentVersion: settings.currentVersion,
      categories: settings.categories,
      versionHistory: settings.versionHistory,
    },
  });
}

export async function getCookiePolicySettings(req, res) {
  const settings = await getOrCreateCookiePolicySettings();
  res.json({ success: true, policy: settings });
}

export async function updateCookiePolicySettings(req, res) {
  const settings = await getOrCreateCookiePolicySettings();
  const body = req.body || {};

  if (body.categories) {
    settings.categories = {
      necessary: true,
      analytics: Boolean(body.categories.analytics),
      marketing: Boolean(body.categories.marketing),
      functional: Boolean(body.categories.functional),
    };
  }

  const nextVersion = String(body.currentVersion ?? settings.currentVersion).trim().slice(0, 32);
  const versionNote = String(body.versionNote ?? "").trim().slice(0, 500);

  if (nextVersion && nextVersion !== settings.currentVersion) {
    settings.currentVersion = nextVersion;
    settings.versionHistory = [
      ...(settings.versionHistory || []),
      { version: nextVersion, note: versionNote || "Policy updated", publishedAt: new Date() },
    ].slice(-20);
  }

  await settings.save();
  res.json({ success: true, policy: settings });
}

export async function deleteCookieConsent(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(404, "Record not found");
  }
  const item = await CookieConsent.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, "Record not found");
  res.json({ success: true, message: "Removed" });
}

export async function listCookieConsentCountries(req, res) {
  const countries = await CookieConsent.distinct("country", { country: { $ne: "" } });
  res.json({ success: true, countries: countries.sort() });
}

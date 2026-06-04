import mongoose from "mongoose";
import { Offer } from "../models/Offer.js";
import { ApiError } from "../utils/helpers.js";
import { buildMembershipDoc } from "../utils/membershipOfferDoc.js";
import { MEMBERSHIP_DEFAULTS, serializeOffer } from "../utils/offerSerialize.js";

const MEMBERSHIP_SLUGS = ["silver-membership", "gold-membership", "diamond-membership"];

function offersCollection() {
  return mongoose.connection.collection("offers");
}

function assertMembershipTier(body) {
  if (body.slug && !MEMBERSHIP_SLUGS.includes(body.slug)) {
    throw new ApiError(400, "Tier must be Silver, Gold, or Diamond");
  }
}

async function findOffer(id) {
  let offer = await Offer.findById(id).catch(() => null);
  if (!offer) offer = await Offer.findOne({ slug: id });
  if (!offer) throw new ApiError(404, "Offer not found");
  return offer;
}

function normalizeBody(body) {
  const next = { ...body };
  if (Array.isArray(next.benefits)) {
    next.benefits = next.benefits.map((b) => String(b).trim()).filter(Boolean);
  } else if (typeof next.benefits === "string") {
    next.benefits = next.benefits
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);
  }
  return next;
}

async function assertPriceSaved(id, expectedPrice) {
  const raw = await offersCollection().findOne({
    _id: new mongoose.Types.ObjectId(String(id)),
  });
  const saved = Number(raw?.price);
  if (!Number.isFinite(saved) || saved <= 0) {
    throw new ApiError(
      500,
      "Price did not save to the database. Stop the API (Ctrl+C), run: npm run dev, then save the tier again.",
    );
  }
  if (expectedPrice && saved !== expectedPrice) {
    throw new ApiError(500, `Price mismatch (saved ${saved}, expected ${expectedPrice})`);
  }
}

async function persistOfferUpdate(id, body) {
  const now = new Date();
  const doc = buildMembershipDoc(body);
  const result = await offersCollection().updateOne(
    { _id: new mongoose.Types.ObjectId(String(id)) },
    { $set: { ...doc, updatedAt: now } },
  );
  if (result.matchedCount === 0) throw new ApiError(404, "Offer not found");
  await assertPriceSaved(id, doc.price);
  const saved = await Offer.findById(id);
  if (!saved) throw new ApiError(500, "Could not load offer after save");
  return saved;
}

async function persistOfferCreate(body) {
  const now = new Date();
  const doc = { ...buildMembershipDoc(body), createdAt: now, updatedAt: now };
  const result = await offersCollection().insertOne(doc);
  await assertPriceSaved(result.insertedId, doc.price);
  const saved = await Offer.findById(result.insertedId);
  if (!saved) throw new ApiError(500, "Could not load offer after create");
  return saved;
}

export async function listOffers(req, res) {
  const filter = {};
  if (!req.user || req.user.role !== "admin") filter.active = true;
  else if (req.query.active !== undefined) filter.active = req.query.active === "true";

  if (req.query.offerType === "membership") {
    filter.slug = { $in: MEMBERSHIP_SLUGS };
  } else if (req.query.offerType) {
    filter.offerType = req.query.offerType;
  }

  const offers = await Offer.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  const forAdmin = req.user?.role === "admin";
  res.json({
    success: true,
    total: offers.length,
    offers: offers.map((o) => serializeOffer(o, { forAdmin })),
  });
}

export async function getOffer(req, res) {
  const offer = await findOffer(req.params.id);
  const forAdmin = req.user?.role === "admin";
  res.json({ success: true, offer: serializeOffer(offer, { forAdmin }) });
}

export async function createOffer(req, res) {
  const body = normalizeBody(req.body);
  assertMembershipTier(body);
  if (!body.title?.trim()) throw new ApiError(400, "Tier name is required");
  if (await Offer.findOne({ slug: body.slug })) {
    throw new ApiError(409, "This tier already exists");
  }
  const offer = await persistOfferCreate(body);
  res.status(201).json({ success: true, offer: serializeOffer(offer, { forAdmin: true }) });
}

export async function updateOffer(req, res) {
  const existing = await findOffer(req.params.id);
  const body = normalizeBody(req.body);
  assertMembershipTier(body);
  if (body.slug && body.slug !== existing.slug && (await Offer.findOne({ slug: body.slug }))) {
    throw new ApiError(409, "This tier already exists");
  }
  const offer = await persistOfferUpdate(existing._id, body);
  res.json({ success: true, offer: serializeOffer(offer, { forAdmin: true }) });
}

export async function deleteOffer(req, res) {
  const offer = await findOffer(req.params.id);
  const hard = req.query.hard === "true";
  if (hard) {
    await offer.deleteOne();
    return res.json({ success: true, message: "Offer deleted permanently" });
  }
  offer.active = false;
  await offer.save();
  res.json({ success: true, message: "Offer deactivated" });
}

/** Backfill price + membership fields on existing tier documents */
export async function repairMembershipOffers(_req, res) {
  const offers = await Offer.find({ slug: { $in: MEMBERSHIP_SLUGS } });
  let updated = 0;

  for (const doc of offers) {
    const defaults = MEMBERSHIP_DEFAULTS[doc.slug] || {};
    const raw = await offersCollection().findOne({ _id: doc._id });
    const existingPrice = Number(raw?.price);
    const price =
      Number.isFinite(existingPrice) && existingPrice > 0
        ? existingPrice
        : (defaults.price ?? 1500);

    const patch = buildMembershipDoc({
      slug: doc.slug,
      title: doc.title || defaults.title || "Membership",
      subtitle: doc.subtitle,
      description: doc.description,
      cardTitle: defaults.cardTitle,
      feeLabel: defaults.feeLabel,
      benefits: defaults.benefits,
      price,
      sortOrder: doc.sortOrder,
      active: doc.active !== false,
      ctaText: doc.ctaText,
      ctaLink: doc.ctaLink,
    });

    await offersCollection().updateOne({ _id: doc._id }, { $set: { ...patch, updatedAt: new Date() } });
    updated += 1;
  }

  for (const slug of MEMBERSHIP_SLUGS) {
    if (offers.some((o) => o.slug === slug)) continue;
    const defaults = MEMBERSHIP_DEFAULTS[slug];
    const title = slug.replace("-membership", "");
    await persistOfferCreate({
      slug,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      subtitle: "Premium wellness & cyber access",
      price: defaults.price,
      cardTitle: defaults.cardTitle,
      feeLabel: defaults.feeLabel,
      benefits: defaults.benefits,
      sortOrder: slug === "silver-membership" ? 1 : slug === "gold-membership" ? 2 : 3,
      active: true,
    });
    updated += 1;
  }

  const fresh = await Offer.find({ slug: { $in: MEMBERSHIP_SLUGS } }).sort({ sortOrder: 1 });
  res.json({
    success: true,
    message: `Updated ${updated} tier(s) with prices in MongoDB`,
    offers: fresh.map((o) => serializeOffer(o, { forAdmin: true })),
  });
}

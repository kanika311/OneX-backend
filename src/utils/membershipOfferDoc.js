import { ApiError } from "./helpers.js";

/** Exact fields written to MongoDB — price is never omitted */
export function buildMembershipDoc(body) {
  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new ApiError(400, "Enter a price greater than 0");
  }

  const benefits = Array.isArray(body.benefits)
    ? body.benefits.map((b) => String(b).trim()).filter(Boolean)
    : [];

  return {
    slug: String(body.slug ?? "").trim(),
    offerType: "membership",
    title: String(body.title ?? "").trim(),
    subtitle: String(body.subtitle ?? "Premium wellness & cyber access").trim(),
    description: String(body.description ?? body.subtitle ?? "Premium wellness & cyber access").trim(),
    cardTitle: String(body.cardTitle ?? "Founding Member").trim(),
    price,
    feeLabel: String(body.feeLabel ?? "One-time fee").trim(),
    benefits,
    discountLabel: String(body.discountLabel ?? ""),
    discountPercent: Number(body.discountPercent) || 0,
    promoCode: String(body.promoCode ?? ""),
    image: String(body.image ?? ""),
    ctaText: String(body.ctaText ?? "Get Your Membership Card").trim(),
    ctaLink: String(body.ctaLink ?? "/contact").trim(),
    featured: Boolean(body.featured),
    sortOrder: Number(body.sortOrder) || 0,
    active: body.active !== false,
    contactPhone: String(body.contactPhone ?? "").replace(/\D/g, ""),
  };
}

const MEMBERSHIP_DEFAULTS = {
  "silver-membership": {
    price: 1500,
    cardTitle: "Founding Member",
    feeLabel: "One-time fee",
    benefits: [
      "Access to exclusive member rewards",
      "Priority booking access",
      "Insider discounts",
      "Special promotional offers",
      "Community member benefits",
    ],
  },
  "gold-membership": {
    price: 2500,
    cardTitle: "Founding Member",
    feeLabel: "One-time fee",
    benefits: [
      "Access to exclusive member rewards",
      "Priority booking access",
      "Insider discounts",
      "Special promotional offers",
      "Community member benefits",
    ],
  },
  "diamond-membership": {
    price: 5000,
    cardTitle: "Founding Member",
    feeLabel: "One-time fee",
    benefits: [
      "Access to exclusive member rewards",
      "Priority booking access",
      "Insider discounts",
      "Special promotional offers",
      "Community member benefits",
    ],
  },
};

function readPrice(o, defaults) {
  if (o.price === undefined || o.price === null) {
    return defaults.price ?? 0;
  }
  const n = Number(o.price);
  return Number.isFinite(n) ? n : (defaults.price ?? 0);
}

function storedPrice(o) {
  if (o.price === undefined || o.price === null) return 0;
  const n = Number(o.price);
  return Number.isFinite(n) ? n : 0;
}

/** Admin list: only price saved in DB. Public site: fill defaults when missing. */
export function serializeOffer(doc, options = {}) {
  const { forAdmin = false } = options;
  const o = doc?.toObject ? doc.toObject() : { ...doc };
  const defaults = MEMBERSHIP_DEFAULTS[o.slug] || {};
  const price = forAdmin ? storedPrice(o) : readPrice(o, defaults);
  return {
    ...o,
    offerType: o.offerType || "membership",
    cardTitle: o.cardTitle || defaults.cardTitle || "Founding Member",
    price,
    feeLabel: o.feeLabel || defaults.feeLabel || "One-time fee",
    benefits:
      Array.isArray(o.benefits) && o.benefits.length > 0 ? o.benefits : (defaults.benefits || []),
    subtitle: o.subtitle || "Premium wellness & cyber access",
  };
}

export { MEMBERSHIP_DEFAULTS };

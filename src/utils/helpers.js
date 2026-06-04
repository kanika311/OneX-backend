export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function productOfferingId(product) {
  return `${product.domain}/${product.category}/${product.slug}`;
}

export function cartKeyForProduct(product) {
  const type = product.category === "courses" ? "course" : "service";
  return `${type}:${productOfferingId(product)}`;
}

/** Static site catalog id: domain/category/slug — also accepts slug-only */
export function parseOfferingPath(productId) {
  if (!productId || typeof productId !== "string") return null;
  const trimmed = productId.trim().replace(/^\/+/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length === 1) {
    return { domain: null, category: null, slug: parts[0], offeringId: parts[0] };
  }
  if (parts.length !== 3) return null;
  const [domain, category, slug] = parts;
  if (!domain || !category || !slug) return null;
  const offeringId = `${domain}/${category}/${slug}`;
  return { domain, category, slug, offeringId };
}

/** Digits-only phone (10–15 digits) for login/register */
export function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function catalogCartKey(offeringId) {
  const parsed = parseOfferingPath(offeringId);
  if (!parsed) return null;
  const type = parsed.category === "courses" ? "course" : "service";
  return `${type}:${parsed.offeringId}`;
}

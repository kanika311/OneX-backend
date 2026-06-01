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

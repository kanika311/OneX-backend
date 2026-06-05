import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ApiError, cartKeyForProduct, productOfferingId } from "../utils/helpers.js";
import { normalizeImageForStorage, resolveMediaUrl } from "../utils/mediaUrl.js";

/** Public API: full image URL. DB keeps /uploads/... only. */
function formatProduct(p, req) {
  const doc = p.toObject ? p.toObject({ virtuals: true }) : { ...p };
  if (doc.image) doc.image = resolveMediaUrl(doc.image, req);
  return { ...doc, offeringId: doc.offeringId || productOfferingId(doc), cartKey: cartKeyForProduct(doc) };
}

function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function findProduct(id) {
  const key = decodeURIComponent(String(id ?? "").trim());
  if (mongoose.Types.ObjectId.isValid(key)) {
    const byId = await Product.findById(key);
    if (byId) return byId;
  }
  if (!key.includes("/")) {
    const bySlug = await Product.findOne({ slug: normalizeSlug(key) || key });
    if (bySlug) return bySlug;
  }
  if (key.includes("/")) {
    const [domain, category, slug] = key.split("/");
    const byPath = await Product.findOne({ domain, category, slug });
    if (byPath) return byPath;
  }
  throw new ApiError(404, "Product not found");
}

export async function listProducts(req, res) {
  const { domain, category, active, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (domain) filter.domain = domain;
  if (category) filter.category = category;
  if (active !== undefined) filter.active = active === "true";
  else if (!req.user || req.user.role !== "admin") filter.active = true;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, total, products: items.map((p) => formatProduct(p, req)) });
}

export async function getProduct(req, res) {
  const product = await findProduct(req.params.id);
  res.json({ success: true, product: formatProduct(product, req) });
}

export async function createProduct(req, res) {
  const body = { ...req.body };
  if (body.image) body.image = normalizeImageForStorage(body.image);
  body.slug = normalizeSlug(body.slug) || normalizeSlug(body.title);
  if (!body.slug) throw new ApiError(400, "Slug is required");
  const taken = await Product.findOne({ slug: body.slug });
  if (taken) throw new ApiError(409, "This slug is already used — choose another");
  const product = await Product.create(body);
  res.status(201).json({ success: true, product: formatProduct(product, req) });
}

export async function updateProduct(req, res) {
  const product = await findProduct(req.params.id);
  const body = { ...req.body };
  if (body.image !== undefined) body.image = normalizeImageForStorage(body.image);
  if (body.slug !== undefined) {
    body.slug = normalizeSlug(body.slug) || product.slug;
    const taken = await Product.findOne({ slug: body.slug, _id: { $ne: product._id } });
    if (taken) throw new ApiError(409, "This slug is already used — choose another");
  }
  Object.assign(product, body);
  await product.save();
  res.json({ success: true, product: formatProduct(product, req) });
}

export async function deleteProduct(req, res) {
  const product = await findProduct(req.params.id);
  const hard = req.query.hard === "true";
  if (hard) {
    await product.deleteOne();
    return res.json({ success: true, message: "Product deleted permanently" });
  }
  product.active = false;
  await product.save();
  res.json({ success: true, message: "Product deactivated" });
}

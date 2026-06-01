import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ApiError, cartKeyForProduct, productOfferingId } from "../utils/helpers.js";

function formatProduct(p) {
  const doc = p.toObject ? p.toObject({ virtuals: true }) : p;
  return { ...doc, offeringId: doc.offeringId || productOfferingId(doc), cartKey: cartKeyForProduct(doc) };
}

async function findProduct(id) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const byId = await Product.findById(id);
    if (byId) return byId;
  }
  if (id.includes("/")) {
    const [domain, category, slug] = id.split("/");
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
  res.json({ success: true, total, products: items.map(formatProduct) });
}

export async function getProduct(req, res) {
  const product = await findProduct(req.params.id);
  res.json({ success: true, product: formatProduct(product) });
}

export async function createProduct(req, res) {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, product: formatProduct(product) });
}

export async function updateProduct(req, res) {
  const product = await findProduct(req.params.id);
  Object.assign(product, req.body);
  await product.save();
  res.json({ success: true, product: formatProduct(product) });
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

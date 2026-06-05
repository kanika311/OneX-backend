import mongoose from "mongoose";
import { Wishlist } from "../models/Wishlist.js";
import { Product } from "../models/Product.js";
import { ApiError, parseOfferingPath, productOfferingId } from "../utils/helpers.js";
import { resolveMediaUrl } from "../utils/mediaUrl.js";

async function resolveProduct(productId) {
  const key = String(productId ?? "").trim();
  if (mongoose.Types.ObjectId.isValid(key)) {
    const p = await Product.findOne({ _id: key, active: true });
    if (p) return p;
  }
  if (key.includes("/")) {
    const [domain, category, slug] = key.split("/");
    return Product.findOne({ domain, category, slug, active: true });
  }
  return Product.findOne({ slug: key.toLowerCase(), active: true });
}

async function getOrCreateWishlist(userId) {
  let list = await Wishlist.findOne({ user: userId });
  if (!list) list = await Wishlist.create({ user: userId, productIds: [] });
  return list;
}

async function enrichWishlist(list, req) {
  const products = [];
  for (const id of list.productIds) {
    const product = await resolveProduct(id);
    if (!product) continue;
    products.push({
      offeringId: productOfferingId(product),
      title: product.title,
      price: product.price,
      image: resolveMediaUrl(product.image, req),
      domain: product.domain,
      category: product.category,
      slug: product.slug,
      rating: product.rating,
      reviews: product.reviews,
    });
  }
  return products;
}

export async function getWishlist(req, res) {
  const list = await getOrCreateWishlist(req.user._id);
  const products = await enrichWishlist(list, req);
  const validIds = products.map((p) => p.offeringId);
  if (validIds.length !== list.productIds.length) {
    list.productIds = validIds;
    await list.save();
  }
  res.json({ success: true, wishlist: { productIds: validIds, products } });
}

export async function addToWishlist(req, res) {
  const product = await resolveProduct(req.body.productId);
  let offeringId;
  if (product) {
    offeringId = productOfferingId(product);
  } else {
    const catalog = parseOfferingPath(req.body.productId);
    if (!catalog) throw new ApiError(404, "Product not found");
    offeringId = catalog.offeringId;
  }
  const list = await getOrCreateWishlist(req.user._id);
  if (!list.productIds.includes(offeringId)) list.productIds.push(offeringId);
  await list.save();
  res.json({ success: true, wishlist: { productIds: list.productIds, products: await enrichWishlist(list, req) } });
}

export async function removeFromWishlist(req, res) {
  const list = await getOrCreateWishlist(req.user._id);
  list.productIds = list.productIds.filter((id) => id !== req.params.productId);
  await list.save();
  res.json({ success: true, wishlist: { productIds: list.productIds, products: await enrichWishlist(list, req) } });
}

export async function syncWishlist(req, res) {
  const list = await getOrCreateWishlist(req.user._id);
  const valid = [];
  for (const id of req.body.productIds || []) {
    const product = await resolveProduct(id);
    if (product) valid.push(productOfferingId(product));
    else {
      const catalog = parseOfferingPath(id);
      if (catalog) valid.push(catalog.offeringId);
    }
  }
  list.productIds = [...new Set(valid)];
  await list.save();
  res.json({ success: true, wishlist: { productIds: list.productIds, products: await enrichWishlist(list, req) } });
}

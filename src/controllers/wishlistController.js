import mongoose from "mongoose";
import { Wishlist } from "../models/Wishlist.js";
import { Product } from "../models/Product.js";
import { ApiError, productOfferingId } from "../utils/helpers.js";

async function resolveProduct(productId) {
  if (mongoose.Types.ObjectId.isValid(productId)) {
    const p = await Product.findOne({ _id: productId, active: true });
    if (p) return p;
  }
  if (productId.includes("/")) {
    const [domain, category, slug] = productId.split("/");
    return Product.findOne({ domain, category, slug, active: true });
  }
  return null;
}

async function getOrCreateWishlist(userId) {
  let list = await Wishlist.findOne({ user: userId });
  if (!list) list = await Wishlist.create({ user: userId, productIds: [] });
  return list;
}

async function enrichWishlist(list) {
  const products = [];
  for (const id of list.productIds) {
    const product = await resolveProduct(id);
    if (!product) continue;
    products.push({
      offeringId: productOfferingId(product),
      title: product.title,
      price: product.price,
      image: product.image,
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
  const products = await enrichWishlist(list);
  res.json({ success: true, wishlist: { productIds: list.productIds, products } });
}

export async function addToWishlist(req, res) {
  const product = await resolveProduct(req.body.productId);
  if (!product) throw new ApiError(404, "Product not found");
  const offeringId = productOfferingId(product);
  const list = await getOrCreateWishlist(req.user._id);
  if (!list.productIds.includes(offeringId)) list.productIds.push(offeringId);
  await list.save();
  res.json({ success: true, wishlist: { productIds: list.productIds, products: await enrichWishlist(list) } });
}

export async function removeFromWishlist(req, res) {
  const list = await getOrCreateWishlist(req.user._id);
  list.productIds = list.productIds.filter((id) => id !== req.params.productId);
  await list.save();
  res.json({ success: true, wishlist: { productIds: list.productIds, products: await enrichWishlist(list) } });
}

export async function syncWishlist(req, res) {
  const list = await getOrCreateWishlist(req.user._id);
  const valid = [];
  for (const id of req.body.productIds || []) {
    const product = await resolveProduct(id);
    if (product) valid.push(productOfferingId(product));
  }
  list.productIds = [...new Set(valid)];
  await list.save();
  res.json({ success: true, wishlist: { productIds: list.productIds, products: await enrichWishlist(list) } });
}

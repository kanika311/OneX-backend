import mongoose from "mongoose";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import {
  ApiError,
  cartKeyForProduct,
  catalogCartKey,
  parseOfferingPath,
  productOfferingId,
} from "../utils/helpers.js";
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

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

async function enrichCart(cart, req) {
  const enriched = [];
  let subtotal = 0;
  for (const item of cart.items) {
    const product = await resolveProduct(item.productId);
    if (!product) continue;
    const cartKey = cartKeyForProduct(product);
    const row = {
      ...item.toObject(),
      cartKey,
      product: {
        offeringId: productOfferingId(product),
        title: product.title,
        price: product.price,
        image: resolveMediaUrl(product.image, req),
        domain: product.domain,
        category: product.category,
        slug: product.slug,
      },
      lineTotal: product.price * item.quantity,
    };
    subtotal += row.lineTotal;
    enriched.push(row);
  }
  return { items: enriched, subtotal, count: enriched.reduce((n, i) => n + i.quantity, 0) };
}

async function pruneCartItems(cart) {
  const kept = [];
  for (const item of cart.items) {
    const product = await resolveProduct(item.productId);
    if (!product) continue;
    kept.push({
      productId: productOfferingId(product),
      cartKey: cartKeyForProduct(product),
      type: product.category === "courses" ? "course" : "service",
      quantity: item.quantity || 1,
    });
  }
  if (kept.length !== cart.items.length) {
    cart.items = kept;
    await cart.save();
  }
  return changed;
}

export async function getCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  await pruneCartItems(cart);
  res.json({ success: true, cart: await enrichCart(cart, req) });
}

export async function addToCart(req, res) {
  const { productId, quantity = 1 } = req.body;
  const product = await resolveProduct(productId);
  let offeringId;
  let cartKey;
  let type;
  if (product) {
    offeringId = productOfferingId(product);
    cartKey = cartKeyForProduct(product);
    type = product.category === "courses" ? "course" : "service";
  } else {
    const catalog = parseOfferingPath(productId);
    if (!catalog) throw new ApiError(404, "Product not found");
    offeringId = catalog.offeringId;
    cartKey = catalogCartKey(offeringId);
    type = catalog.category === "courses" ? "course" : "service";
  }
  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find((i) => i.cartKey === cartKey);
  if (existing) existing.quantity += Number(quantity);
  else {
    cart.items.push({
      productId: offeringId,
      cartKey,
      type,
      quantity: Number(quantity),
    });
  }
  await cart.save();
  res.json({ success: true, cart: await enrichCart(cart, req) });
}

export async function removeFromCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = cart.items.filter((i) => i.cartKey !== req.params.cartKey);
  await cart.save();
  res.json({ success: true, cart: await enrichCart(cart, req) });
}

/** Empty cart after successful checkout */
export async function clearCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, cart: await enrichCart(cart, req) });
}

/** Remove only items that were paid for (cartKeys in body) */
export async function removeCartItems(req, res) {
  const keys = Array.isArray(req.body.cartKeys) ? req.body.cartKeys.map(String) : [];
  if (keys.length === 0) {
    return clearCart(req, res);
  }
  const cart = await getOrCreateCart(req.user._id);
  const drop = new Set(keys);
  cart.items = cart.items.filter((i) => !drop.has(i.cartKey));
  await cart.save();
  res.json({ success: true, cart: await enrichCart(cart, req) });
}

export async function syncCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  for (const entry of req.body.items || []) {
    const pid = entry.productId || entry.offeringId || entry.cartKey?.split(":").slice(1).join(":");
    const product = await resolveProduct(pid);
    if (product) {
      cart.items.push({
        productId: productOfferingId(product),
        cartKey: cartKeyForProduct(product),
        type: product.category === "courses" ? "course" : "service",
        quantity: entry.quantity || 1,
      });
      continue;
    }
    const catalog = parseOfferingPath(pid);
    if (!catalog) continue;
    const offeringId = catalog.offeringId;
    cart.items.push({
      productId: offeringId,
      cartKey: entry.cartKey || catalogCartKey(offeringId),
      type: catalog.category === "courses" ? "course" : "service",
      quantity: entry.quantity || 1,
    });
  }
  await cart.save();
  res.json({ success: true, cart: await enrichCart(cart, req) });
}

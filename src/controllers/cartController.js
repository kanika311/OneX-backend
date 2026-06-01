import mongoose from "mongoose";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { ApiError, cartKeyForProduct, productOfferingId } from "../utils/helpers.js";

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

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

async function enrichCart(cart) {
  const enriched = [];
  let subtotal = 0;
  for (const item of cart.items) {
    const product = await resolveProduct(item.productId);
    if (!product) continue;
    const lineTotal = product.price * item.quantity;
    subtotal += lineTotal;
    enriched.push({
      ...item.toObject(),
      product: {
        offeringId: productOfferingId(product),
        title: product.title,
        price: product.price,
        image: product.image,
        domain: product.domain,
        category: product.category,
        slug: product.slug,
      },
      lineTotal,
    });
  }
  return { items: enriched, subtotal, count: enriched.reduce((n, i) => n + i.quantity, 0) };
}

export async function getCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  res.json({ success: true, cart: await enrichCart(cart) });
}

export async function addToCart(req, res) {
  const { productId, quantity = 1 } = req.body;
  const product = await resolveProduct(productId);
  if (!product) throw new ApiError(404, "Product not found");
  const cart = await getOrCreateCart(req.user._id);
  const offeringId = productOfferingId(product);
  const cartKey = cartKeyForProduct(product);
  const existing = cart.items.find((i) => i.cartKey === cartKey);
  if (existing) existing.quantity += Number(quantity);
  else {
    cart.items.push({
      productId: offeringId,
      cartKey,
      type: product.category === "courses" ? "course" : "service",
      quantity: Number(quantity),
    });
  }
  await cart.save();
  res.json({ success: true, cart: await enrichCart(cart) });
}

export async function removeFromCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = cart.items.filter((i) => i.cartKey !== req.params.cartKey);
  await cart.save();
  res.json({ success: true, cart: await enrichCart(cart) });
}

export async function syncCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  for (const entry of req.body.items || []) {
    const pid = entry.productId || entry.offeringId;
    const product = await resolveProduct(pid);
    if (!product) continue;
    cart.items.push({
      productId: productOfferingId(product),
      cartKey: cartKeyForProduct(product),
      type: product.category === "courses" ? "course" : "service",
      quantity: entry.quantity || 1,
    });
  }
  await cart.save();
  res.json({ success: true, cart: await enrichCart(cart) });
}

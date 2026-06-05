/**
 * One-time: rewrite product images from localhost full URLs to /uploads/... paths.
 * Run: node scripts/fix-image-urls.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Product } from "../src/models/Product.js";
import { normalizeImageForStorage } from "../src/utils/mediaUrl.js";

await connectDB();

const products = await Product.find({ image: { $regex: /uploads/i } });
let updated = 0;

for (const p of products) {
  const next = normalizeImageForStorage(p.image);
  if (next && next !== p.image) {
    p.image = next;
    await p.save();
    updated += 1;
    console.log(p.slug, "->", next);
  }
}

console.log(`Updated ${updated} of ${products.length} products with upload images.`);
await mongoose.disconnect();

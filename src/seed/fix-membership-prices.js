import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Offer } from "../models/Offer.js";
import { buildMembershipDoc } from "../utils/membershipOfferDoc.js";
import { MEMBERSHIP_DEFAULTS } from "../utils/offerSerialize.js";

const SLUGS = ["silver-membership", "gold-membership", "diamond-membership"];

async function fix() {
  await connectDB();
  const col = mongoose.connection.collection("offers");

  for (const slug of SLUGS) {
    const doc = await Offer.findOne({ slug });
    if (!doc) {
      console.log("Skip (missing):", slug);
      continue;
    }

    const defaults = MEMBERSHIP_DEFAULTS[slug];
    const raw = await col.findOne({ _id: doc._id });
    const existing = Number(raw?.price);
    const price =
      Number.isFinite(existing) && existing > 0 ? existing : defaults.price;

    const patch = buildMembershipDoc({
      slug,
      title: doc.title,
      subtitle: doc.subtitle,
      description: doc.description,
      cardTitle: defaults.cardTitle,
      feeLabel: defaults.feeLabel,
      benefits: defaults.benefits,
      price,
      sortOrder: doc.sortOrder,
      active: doc.active !== false,
      ctaText: doc.ctaText,
      ctaLink: doc.ctaLink,
    });

    await col.updateOne({ _id: doc._id }, { $set: { ...patch, updatedAt: new Date() } });
    const check = await col.findOne({ _id: doc._id });
    console.log(slug, "→ price =", check?.price);
  }

  console.log("Done. Refresh admin Gift cards page.");
  process.exit(0);
}

fix().catch((err) => {
  console.error(err);
  process.exit(1);
});

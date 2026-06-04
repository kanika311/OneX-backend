import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Offer } from "../models/Offer.js";
import { buildMembershipDoc } from "../utils/membershipOfferDoc.js";
import { MEMBERSHIP_DEFAULTS } from "../utils/offerSerialize.js";

const SLUGS = ["silver-membership", "gold-membership", "diamond-membership"];

async function sync() {
  await connectDB();
  const col = mongoose.connection.collection("offers");
  const now = new Date();

  for (const slug of SLUGS) {
    const defaults = MEMBERSHIP_DEFAULTS[slug];
    const title = slug.replace("-membership", "");
    const patch = buildMembershipDoc({
      slug,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      subtitle: "Premium wellness & cyber access",
      price: defaults.price,
      cardTitle: defaults.cardTitle,
      feeLabel: defaults.feeLabel,
      benefits: defaults.benefits,
      sortOrder: slug === "silver-membership" ? 1 : slug === "gold-membership" ? 2 : 3,
      active: true,
    });

    const existing = await Offer.findOne({ slug });
    if (existing) {
      await col.updateOne({ _id: existing._id }, { $set: { ...patch, updatedAt: now } });
      console.log("Updated", slug, "→ ₹", defaults.price);
    } else {
      await col.insertOne({ ...patch, createdAt: now, updatedAt: now });
      console.log("Created", slug, "→ ₹", defaults.price);
    }
  }

  console.log("Done.");
  process.exit(0);
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});

import "dotenv/config";
import { connectDB } from "../config/db.js";
import { Product } from "../models/Product.js";
import { Offer } from "../models/Offer.js";
import { User } from "../models/User.js";

const sampleProducts = [
  {
    slug: "ethical-hacking",
    domain: "cyber",
    category: "courses",
    title: "Ethical Hacking",
    description: "Hands-on offensive security with certification-aligned labs.",
    duration: "12 weeks",
    price: 24999,
    image: "/ethicalHacking.jpeg",
    iconKey: "zap",
    bestseller: true,
    benefits: ["Live labs", "CEH-aligned", "Capstone"],
    faq: [{ q: "Beginner friendly?", a: "Yes." }],
    cta: "Enroll now",
  },
  {
    slug: "soc-analyst",
    domain: "cyber",
    category: "courses",
    title: "SOC Analyst",
    description: "SIEM workflows and threat hunting for modern SOCs.",
    duration: "10 weeks",
    price: 21999,
    image: "/soc.jpeg",
    iconKey: "monitor",
    bestseller: true,
    benefits: ["Splunk", "Alert triage"],
    faq: [],
    cta: "Enroll now",
  },
  {
    slug: "pain-management",
    domain: "physio",
    category: "therapy",
    title: "Pain Management",
    description: "Non-surgical relief with manual therapy and dry needling.",
    duration: "45 min",
    price: 1999,
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=1000&fit=crop&q=72",
    iconKey: "heart",
    bestseller: true,
    benefits: ["Dry needling", "Manual therapy"],
    faq: [],
    cta: "Book now",
  },
];

const sampleOffers = [
  {
    slug: "founding-member",
    title: "Founding Member",
    subtitle: "Join the first 100 members",
    description: "Unlock premium benefits and exclusive rewards.",
    discountLabel: "From $5",
    discountPercent: 90,
    promoCode: "FOUNDING100",
    featured: true,
    sortOrder: 1,
    active: true,
    ctaText: "Become a member",
    ctaLink: "/contact",
  },
];

async function seed() {
  await connectDB();
  await Product.deleteMany({});
  await Product.insertMany(sampleProducts);
  await Offer.deleteMany({});
  await Offer.insertMany(sampleOffers);

  const email = process.env.ADMIN_EMAIL || "admin@1x-dr-ayesha.com";
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({ name: "Admin", email, password, role: "admin" });
    console.log("Admin created:", email);
  } else {
    console.log("Admin already exists:", email);
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

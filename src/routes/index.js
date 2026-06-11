import { Router } from "express";
import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import offerRoutes from "./offerRoutes.js";
import adminRoutes from "./adminRoutes.js";
import cartRoutes from "./cartRoutes.js";
import wishlistRoutes from "./wishlistRoutes.js";
import orderRoutes from "./orderRoutes.js";
import siteContentRoutes from "./siteContentRoutes.js";
import testimonialRoutes from "./testimonialRoutes.js";
import contactInquiryRoutes from "./contactInquiryRoutes.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ success: true, message: "1X API running" }));
router.use("/auth", authRoutes);
router.use("/orders", orderRoutes);
router.use("/products", productRoutes);
router.use("/offers", offerRoutes);
router.use("/admin", adminRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/site-content", siteContentRoutes);
router.use("/testimonials", testimonialRoutes);
router.use("/contact-inquiries", contactInquiryRoutes);

export default router;

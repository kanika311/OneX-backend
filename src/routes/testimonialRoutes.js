import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect, adminOnly, optionalAuth } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import * as testimonials from "../controllers/testimonialController.js";

const router = Router();

router.get("/", optionalAuth, asyncHandler(testimonials.listTestimonials));
router.post(
  "/",
  imageUpload.single("photo"),
  asyncHandler(testimonials.submitTestimonial),
);
router.patch("/:id", protect, adminOnly, asyncHandler(testimonials.updateTestimonial));
router.delete("/:id", protect, adminOnly, asyncHandler(testimonials.deleteTestimonial));

export default router;

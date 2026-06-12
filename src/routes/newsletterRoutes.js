import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect, adminOnly } from "../middleware/auth.js";
import * as newsletter from "../controllers/newsletterController.js";

const router = Router();

router.post("/", asyncHandler(newsletter.subscribeNewsletter));
router.get("/", protect, adminOnly, asyncHandler(newsletter.listNewsletterSubscribers));
router.delete("/:id", protect, adminOnly, asyncHandler(newsletter.deleteNewsletterSubscriber));

export default router;

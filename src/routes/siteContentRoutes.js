import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect, adminOnly } from "../middleware/auth.js";
import * as site from "../controllers/siteContentController.js";

const router = Router();

// public read (used by website)
router.get("/", asyncHandler(site.getSiteContent));

// admin update
router.put("/", protect, adminOnly, asyncHandler(site.upsertSiteContent));

export default router;


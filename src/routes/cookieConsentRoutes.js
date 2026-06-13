import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect, adminOnly } from "../middleware/auth.js";
import * as cookieConsent from "../controllers/cookieConsentController.js";

const router = Router();

router.post("/", asyncHandler(cookieConsent.recordCookieConsent));
router.get("/", protect, adminOnly, asyncHandler(cookieConsent.listCookieConsents));
router.delete("/:id", protect, adminOnly, asyncHandler(cookieConsent.deleteCookieConsent));

export default router;

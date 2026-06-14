import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect, adminOnly } from "../middleware/auth.js";
import * as cookieConsent from "../controllers/cookieConsentController.js";

const router = Router();

router.post("/", asyncHandler(cookieConsent.recordCookieConsent));
router.get("/policy/public", asyncHandler(cookieConsent.getCookiePolicySettings));
router.get("/stats", protect, adminOnly, asyncHandler(cookieConsent.getCookieConsentStats));
router.get("/countries", protect, adminOnly, asyncHandler(cookieConsent.listCookieConsentCountries));
router.get("/policy", protect, adminOnly, asyncHandler(cookieConsent.getCookiePolicySettings));
router.put("/policy", protect, adminOnly, asyncHandler(cookieConsent.updateCookiePolicySettings));
router.get("/", protect, adminOnly, asyncHandler(cookieConsent.listCookieConsents));
router.get("/:id", protect, adminOnly, asyncHandler(cookieConsent.getCookieConsent));
router.delete("/:id", protect, adminOnly, asyncHandler(cookieConsent.deleteCookieConsent));

export default router;

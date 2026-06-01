import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect, adminOnly, optionalAuth } from "../middleware/auth.js";
import * as offers from "../controllers/offerController.js";

const router = Router();

router.get("/", optionalAuth, asyncHandler(offers.listOffers));
router.get("/:id", optionalAuth, asyncHandler(offers.getOffer));
router.post("/", protect, adminOnly, asyncHandler(offers.createOffer));
router.put("/:id", protect, adminOnly, asyncHandler(offers.updateOffer));
router.delete("/:id", protect, adminOnly, asyncHandler(offers.deleteOffer));

export default router;

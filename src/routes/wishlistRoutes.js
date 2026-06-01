import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect } from "../middleware/auth.js";
import * as wishlist from "../controllers/wishlistController.js";

const router = Router();
router.use(protect);
router.get("/", asyncHandler(wishlist.getWishlist));
router.post("/", asyncHandler(wishlist.addToWishlist));
router.put("/sync", asyncHandler(wishlist.syncWishlist));
router.delete("/:productId", asyncHandler(wishlist.removeFromWishlist));

export default router;

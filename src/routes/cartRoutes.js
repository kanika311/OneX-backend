import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect } from "../middleware/auth.js";
import * as cart from "../controllers/cartController.js";

const router = Router();
router.use(protect);
router.get("/", asyncHandler(cart.getCart));
router.post("/", asyncHandler(cart.addToCart));
router.post("/remove-items", asyncHandler(cart.removeCartItems));
router.delete("/clear", asyncHandler(cart.clearCart));
router.put("/sync", asyncHandler(cart.syncCart));
router.delete("/:cartKey", asyncHandler(cart.removeFromCart));

export default router;

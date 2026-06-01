import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect, adminOnly, optionalAuth } from "../middleware/auth.js";
import * as products from "../controllers/productController.js";

const router = Router();

router.get("/", optionalAuth, asyncHandler(products.listProducts));
router.get("/:id", optionalAuth, asyncHandler(products.getProduct));
router.post("/", protect, adminOnly, asyncHandler(products.createProduct));
router.put("/:id", protect, adminOnly, asyncHandler(products.updateProduct));
router.delete("/:id", protect, adminOnly, asyncHandler(products.deleteProduct));

export default router;

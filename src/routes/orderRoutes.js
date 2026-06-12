import { Router } from "express";
import { body } from "express-validator";
import { asyncHandler } from "../utils/helpers.js";
import { optionalAuth, protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as orders from "../controllers/orderController.js";

const router = Router();

router.post(
  "/",
  optionalAuth,
  [
    body("customerName").trim().notEmpty().withMessage("Name is required"),
    body("customerEmail").isEmail().withMessage("Valid email is required"),
    body("customerPhone").optional().trim(),
    body("items").isArray({ min: 1 }).withMessage("Cart is empty"),
    body("items.*.cartKey").notEmpty(),
    body("items.*.title").notEmpty(),
    body("items.*.price")
      .custom((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0;
      })
      .withMessage("Valid item price is required"),
    body("items.*.type").isIn(["course", "service", "membership"]),
  ],
  validate,
  asyncHandler(orders.createOrder),
);

router.get("/mine", protect, asyncHandler(orders.listMyOrders));
router.post("/:id/confirm-payment", asyncHandler(orders.submitOrderPayment));
router.patch("/:id/payment-submitted", asyncHandler(orders.submitOrderPayment));

export default router;

import { Router } from "express";
import { body } from "express-validator";
import { asyncHandler } from "../utils/helpers.js";
import { optionalAuth } from "../middleware/auth.js";
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
    body("items.*.price").isNumeric(),
    body("items.*.type").isIn(["course", "service"]),
  ],
  validate,
  asyncHandler(orders.createOrder),
);

export default router;

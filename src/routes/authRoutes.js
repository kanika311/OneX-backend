import { Router } from "express";
import { body } from "express-validator";
import { asyncHandler } from "../utils/helpers.js";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import * as auth from "../controllers/authController.js";

const router = Router();

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    validate,
  ],
  asyncHandler(auth.register),
);

router.post(
  "/login",
  [body("password").notEmpty().withMessage("Password is required"), validate],
  asyncHandler(auth.login),
);

router.get("/me", protect, asyncHandler(auth.me));

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required"), validate],
  asyncHandler(auth.forgotPassword),
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    validate,
  ],
  asyncHandler(auth.resetPassword),
);

export default router;

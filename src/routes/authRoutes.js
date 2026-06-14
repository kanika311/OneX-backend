import { Router } from "express";
import { body } from "express-validator";
import { asyncHandler } from "../utils/helpers.js";
import { validate } from "../middleware/validate.js";
import { protect, superAdminOnly } from "../middleware/auth.js";
import * as auth from "../controllers/authController.js";

const router = Router();

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
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
  [body("email").trim().isEmail().withMessage("Valid email is required"), validate],
  asyncHandler(auth.forgotPassword),
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("confirmPassword").notEmpty().withMessage("Confirm password is required"),
    validate,
  ],
  asyncHandler(auth.resetPassword),
);

router.get("/admins", protect, superAdminOnly, asyncHandler(auth.listAdmins));

router.post(
  "/admins",
  protect,
  superAdminOnly,
  [
    body("name").trim().notEmpty().withMessage("Full name is required"),
    body("email").trim().isEmail().withMessage("Valid email is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("confirmPassword").notEmpty().withMessage("Confirm password is required"),
    validate,
  ],
  asyncHandler(auth.createAdmin),
);

router.patch("/admins/:id", protect, superAdminOnly, asyncHandler(auth.updateAdmin));

router.delete("/admins/:id", protect, superAdminOnly, asyncHandler(auth.deleteAdmin));

export default router;

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
    body("name").trim().notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    validate,
  ],
  asyncHandler(auth.register),
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty(), validate],
  asyncHandler(auth.login),
);

router.get("/me", protect, asyncHandler(auth.me));

export default router;

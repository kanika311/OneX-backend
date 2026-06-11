import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect, adminOnly } from "../middleware/auth.js";
import * as contact from "../controllers/contactInquiryController.js";

const router = Router();

router.post("/", asyncHandler(contact.submitContactInquiry));
router.get("/", protect, adminOnly, asyncHandler(contact.listContactInquiries));
router.patch("/:id", protect, adminOnly, asyncHandler(contact.updateContactInquiry));
router.delete("/:id", protect, adminOnly, asyncHandler(contact.deleteContactInquiry));

export default router;

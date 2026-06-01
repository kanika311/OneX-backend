import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import * as admin from "../controllers/adminController.js";
import * as orders from "../controllers/orderController.js";
import * as upload from "../controllers/uploadController.js";

const router = Router();

router.use(protect, adminOnly);
router.get("/stats", asyncHandler(admin.dashboardStats));
router.get("/customers", asyncHandler(orders.listCustomers));
router.get("/orders", asyncHandler(orders.listOrders));
router.get("/orders/:id", asyncHandler(orders.getOrder));
router.patch("/orders/:id", asyncHandler(orders.updateOrderStatus));
router.get("/media", asyncHandler(upload.listMedia));
router.post("/upload", imageUpload.single("file"), asyncHandler(upload.uploadImage));
router.delete("/media/:filename", asyncHandler(upload.deleteMedia));

export default router;

import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  listOrders,
  placeOrder,
  updateStatus,
  userOrders,
  createRazorpayOrder,
  verifyPaymentAndPlaceOrder,
  verifyOrder,
  razorpayConfigDebug
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// Razorpay routes
orderRouter.post("/create-order", authMiddleware, createRazorpayOrder);
orderRouter.post("/verify-payment", authMiddleware, verifyPaymentAndPlaceOrder);
orderRouter.post("/verify", verifyOrder);
orderRouter.get("/debug-config", razorpayConfigDebug);

// Existing routes
orderRouter.post("/place", authMiddleware, placeOrder);
orderRouter.post("/status", authMiddleware, updateStatus);
orderRouter.post("/userorders", authMiddleware, userOrders);
orderRouter.get("/list", authMiddleware, listOrders);

export default orderRouter;

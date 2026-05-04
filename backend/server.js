import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import foodRouter from "./routes/foodRoute.js";
import userRouter from "./routes/userRoute.js";
import "dotenv/config";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import { razorpayWebhook } from "./controllers/orderController.js";
import Razorpay from "razorpay";
import crypto from "crypto";

// app config
const app = express();
const port =process.env.PORT || 4000;

//middlewares
app.use(cors());
app.post("/api/order/webhook", express.raw({ type: "application/json" }), razorpayWebhook);
app.use(express.json());

// DB connection
connectDB();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// api endpoints
app.use("/api/food", foodRouter);
app.use("/images", express.static("uploads"));
app.use("/api/user", userRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);

// Create Razorpay order
app.post("/api/payment/orders", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const options = {
      amount: amount * 100, // Convert to smallest currency unit
      currency,
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Razorpay payment
app.post("/api/payment/verify", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Successfull!!!!!!!!!!!!!!!!");
});

app.listen(port, () => {
  console.log(`Server Started on port: ${port}`);
});

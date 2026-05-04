import Razorpay from 'razorpay';
import crypto from 'crypto';
import orderModel from '../models/orderModel.js';
// import cartModel from '../models/cartModel.js'; // If you have cart model

// Create Razorpay Order
export const createRazorpayOrder = async (req, res) => {
  try {
    const configuredMode = (process.env.RAZORPAY_MODE || "test").toLowerCase();
    const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!keyId || !keySecret) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are not configured on server"
      });
    }

    // Auto-detect mode from key prefix to avoid hard failures on env mismatch.
    const detectedMode = keyId.startsWith("rzp_live_") ? "live" : "test";

    const { amount, currency = "INR" } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    const options = {
      amount: Math.round(amount), // Amount should already be in paise
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1, // Auto capture payment
    };

    const razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpayInstance.orders.create(options);

    res.status(200).json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: keyId,
      mode: detectedMode,
      configuredMode
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    const razorpayDescription =
      error?.error?.description ||
      error?.description ||
      error?.message ||
      "Failed to create order";
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: razorpayDescription
    });
  }
};

// Verify Payment and Place Order
export const verifyPaymentAndPlaceOrder = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData
    } = req.body;

    const userId = req.user.id; // From auth middleware

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    // Create order in database
    const { address, items, amount, subtotal, deliveryFee } = orderData;

    const existingOrder = await orderModel.findOne({
      "paymentInfo.razorpayPaymentId": razorpay_payment_id
    });
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        orderId: existingOrder._id
      });
    }

    const newOrder = new orderModel({
      userId,
      items: items.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      amount: amount,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      address: {
        firstName: address.firstName,
        lastName: address.lastName,
        email: address.email,
        street: address.street,
        city: address.city,
        state: address.state,
        zipcode: address.zipcode,
        country: address.country,
        phone: address.phone
      },
      paymentInfo: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "Completed"
      },
      status: "Food Processing",
      date: Date.now(),
      payment: true
    });

    await newOrder.save();

    // Clear user's cart (implement based on your cart structure)
    // Option 1: If using cart model
    // await cartModel.findOneAndDelete({ userId });
    
    // Option 2: If using localStorage (frontend will handle clearing)
    
    res.status(200).json({
      success: true,
      message: "Payment verified and order placed successfully",
      orderId: newOrder._id
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message
    });
  }
};

// Existing placeOrder (for COD or other methods)
export const placeOrder = async (req, res) => {
  try {
    const { address, items, amount } = req.body;
    const userId = req.user.id;

    const newOrder = new orderModel({
      userId,
      items,
      amount,
      address,
      status: "Food Processing",
      date: Date.now(),
      payment: false
    });

    await newOrder.save();
    
    // Clear cart
    // await cartModel.findOneAndDelete({ userId });

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      orderId: newOrder._id
    });
  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to place order"
    });
  }
};

export const userOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await orderModel.find({ userId }).sort({ date: -1 });
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error("User orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
};

export const listOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({}).sort({ date: -1 });
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error("List orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    await orderModel.findByIdAndUpdate(orderId, { status: status });
    res.status(200).json({
      success: true,
      message: "Order status updated"
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status"
    });
  }
};

export const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ success: false, message: "Webhook secret not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      return res.status(400).json({ success: false, message: "Missing webhook signature" });
    }

    const rawBody = req.body?.toString("utf8");
    if (!rawBody) {
      return res.status(400).json({ success: false, message: "Missing webhook body" });
    }

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const parsedBody = JSON.parse(rawBody);
    const event = parsedBody?.event;
    const paymentEntity = parsedBody?.payload?.payment?.entity;

    if (event === "payment.captured" && paymentEntity?.id) {
      await orderModel.findOneAndUpdate(
        { "paymentInfo.razorpayPaymentId": paymentEntity.id },
        { "paymentInfo.status": "Captured", payment: true }
      );
    }

    if (event === "payment.failed" && paymentEntity?.id) {
      await orderModel.findOneAndUpdate(
        { "paymentInfo.razorpayPaymentId": paymentEntity.id },
        { "paymentInfo.status": "Failed", payment: false, status: "Payment Failed" }
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

// Backward-compatible verify endpoint used by /verify page query params flow
export const verifyOrder = async (req, res) => {
  try {
    const { success } = req.body;
    return res.status(200).json({ success: success === "true" || success === true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
};

export const razorpayConfigDebug = async (req, res) => {
  try {
    const mode = (process.env.RAZORPAY_MODE || "test").toLowerCase();
    const keyId = process.env.RAZORPAY_KEY_ID || "";
    return res.status(200).json({
      success: true,
      mode,
      keyPrefix: keyId.slice(0, 9),
      server: "local-backend",
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Debug failed" });
  }
};

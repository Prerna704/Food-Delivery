import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    items: [
      {
        id: { type: String },
        productId: { type: String },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    amount: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    address: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipcode: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: String, required: true },
    },
    status: { type: String, default: "Food Processing" },
    payment: { type: Boolean, default: false },
    paymentInfo: {
      razorpayOrderId: { type: String, default: "" },
      razorpayPaymentId: { type: String, default: "" },
      razorpaySignature: { type: String, default: "" },
      status: { type: String, default: "" },
    },
    date: { type: Number, default: Date.now },
  },
  { minimize: false }
);

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;

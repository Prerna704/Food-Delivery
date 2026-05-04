import React, { useContext, useEffect, useState } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const PlaceOrder = () => {
  const navigate = useNavigate();
  const { getTotalCartAmount, token, food_list, cartItems, url, clearCart } = useContext(StoreContext);

  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "",
    phone: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [isTestMode, setIsTestMode] = useState(
    (import.meta.env.VITE_RAZORPAY_KEY_ID || "").startsWith("rzp_test_")
  );
  const [successDetails, setSuccessDetails] = useState(null);
  const [redirectSeconds, setRedirectSeconds] = useState(1);

  const onOrderSuccess = (message, details) => {
    toast.success(message);
    setSuccessDetails(details);
    if (details?.method === "cod") {
      setRedirectSeconds(1);
      setTimeout(() => navigate("/myorders?tab=active"), 1000);
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!data.firstName) { toast.error("First name is required"); return false; }
    if (!data.lastName) { toast.error("Last name is required"); return false; }
    if (!data.email) { toast.error("Email is required"); return false; }
    if (!data.street) { toast.error("Street address is required"); return false; }
    if (!data.city) { toast.error("City is required"); return false; }
    if (!data.state) { toast.error("State is required"); return false; }
    if (!data.zipcode) { toast.error("Zip code is required"); return false; }
    if (!data.country) { toast.error("Country is required"); return false; }
    if (!data.phone) { toast.error("Phone number is required"); return false; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      toast.error("Invalid email address");
      return false;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(data.phone)) {
      toast.error("Phone number must be 10 digits");
      return false;
    }

    return true;
  };

  const buildOrderItems = () => {
    const orderItems = [];
    food_list.forEach((item) => {
      if (cartItems[item._id] > 0) {
        orderItems.push({
          id: item._id,
          name: item.name,
          price: item.price,
          quantity: cartItems[item._id],
        });
      }
    });
    return orderItems;
  };

  const initiatePayment = async () => {
    if (!token) {
      toast.error("Please login first");
      navigate("/");
      return;
    }

    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      const orderItems = buildOrderItems();
      const subtotal = getTotalCartAmount();
      const deliveryFee = subtotal === 0 ? 0 : 2;
      const totalAmount = (subtotal + deliveryFee) * 100;

      const orderResponse = await axios.post(
        `${url}/api/order/create-order`,
        { amount: totalAmount },
        { headers: { token } }
      );

      if (!orderResponse.data?.success) {
        toast.error(orderResponse.data?.error || orderResponse.data?.message || "Failed to create order");
        setIsProcessing(false);
        return;
      }

      const payload = orderResponse.data?.data || orderResponse.data || {};
      const orderId = payload.id || payload.orderId || payload.order_id;
      const amount = payload.amount;
      const currency = payload.currency || "INR";
      const key = payload.key || import.meta.env.VITE_RAZORPAY_KEY_ID;
      const mode = payload.mode || ((key || "").startsWith("rzp_test_") ? "test" : "live");
      const isTestPayment = mode === "test";
      setIsTestMode(isTestPayment);

      if (!window.Razorpay) {
        toast.error("Razorpay SDK not loaded. Please refresh and try again.");
        setIsProcessing(false);
        return;
      }

      if (!orderId || !key) {
        toast.error("Payment setup failed. Missing order/key from server.");
        setIsProcessing(false);
        return;
      }

      const options = {
        key,
        amount,
        currency,
        name: "Food Delivery App",
        description: isTestPayment ? "Test Payment (No real money)" : "Order Payment",
        order_id: orderId,
        prefill: {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          contact: data.phone,
        },
        notes: {
          address: `${data.street}, ${data.city}, ${data.state} - ${data.zipcode}`,
        },
        theme: {
          color: "#FF6B6B",
        },
        handler: async (response) => {
          try {
            const verifyResponse = await axios.post(
              `${url}/api/order/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData: {
                  address: data,
                  items: orderItems,
                  amount: subtotal + deliveryFee,
                },
              },
              { headers: { token } }
            );

            if (verifyResponse.data.success) {
              await clearCart();
              onOrderSuccess("Payment successful! Order placed.", {
                amount: subtotal + deliveryFee,
                date: new Date().toLocaleDateString(),
                transactionId: response.razorpay_payment_id,
                method: "online",
              });
            } else {
              toast.error("Payment verification failed");
            }
          } catch (error) {
            toast.error("Payment verification failed");
          } finally {
            setIsProcessing(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on("payment.failed", (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Payment initialization failed"
      );
      setIsProcessing(false);
    }
  };

  const placeCodOrder = async () => {
    if (!token) {
      toast.error("Please login first");
      navigate("/");
      return;
    }

    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      const orderItems = buildOrderItems();
      const subtotal = getTotalCartAmount();
      const deliveryFee = subtotal === 0 ? 0 : 2;

      const response = await axios.post(
        `${url}/api/order/place`,
        {
          address: data,
          items: orderItems,
          amount: subtotal + deliveryFee,
        },
        { headers: { token } }
      );

      if (response.data.success) {
        await clearCart();
        onOrderSuccess("Order placed successfully!", {
          amount: subtotal + deliveryFee,
          date: new Date().toLocaleDateString(),
          transactionId: response.data.orderId || "COD",
          method: "cod",
        });
      } else {
        toast.error(response.data.message || "Failed to place COD order");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to place COD order");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!token) {
      toast.error("Please login first");
      navigate("/cart");
    } else if (getTotalCartAmount() === 0) {
      toast.error("Please add items to cart");
      navigate("/cart");
    }
  }, [token, getTotalCartAmount, navigate]);

  useEffect(() => {
    if (successDetails?.method !== "cod") return;
    if (redirectSeconds <= 0) return;
    const timer = setTimeout(() => setRedirectSeconds((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [successDetails, redirectSeconds]);

  return (
    <>
      {successDetails?.method === "cod" && (
        <div className="cod-success-overlay">
          <div className="cod-success-card">
            <p className="cod-success-top">You will be redirected in {redirectSeconds} seconds</p>
            <h2>Payment Successful</h2>
            <div className="cod-success-check">&#10003;</div>
            <div className="cod-success-receipt">
              <div className="cod-success-receipt-row">
                <b>Food Delivery App</b>
                <b>₹{successDetails.amount}</b>
              </div>
              <p>{successDetails.date}</p>
              <p>Transaction ID: {successDetails.transactionId}</p>
            </div>
          </div>
        </div>
      )}

      {successDetails && successDetails.method !== "cod" && (
        <div className="payment-success-inline">
          <div className="payment-success-inline-icon">&#10003;</div>
          <h2>Payment confirmed</h2>
          <div className="payment-success-meta">
            <p><span>Amount:</span> ?{successDetails.amount}</p>
            <p><span>Date:</span> {successDetails.date}</p>
            <p><span>Transaction ID:</span> {successDetails.transactionId}</p>
          </div>
          <button
            type="button"
            className="payment-success-inline-btn"
            onClick={() => navigate("/myorders?tab=active")}
          >
            View Active Orders
          </button>
        </div>
      )}

      {!successDetails && (
        <form className="place-order" onSubmit={(e) => { e.preventDefault(); paymentMethod === "cod" ? placeCodOrder() : initiatePayment(); }}>
          <div className="place-order-left">
            {isTestMode && (
              <p className="test-mode-note">
                Test Mode: No real money will be deducted. Use Razorpay test payment flow.
              </p>
            )}
            {isTestMode && (
              <p className="test-mode-note-secondary">
                If QR fails in test mode, open another payment option in Razorpay checkout (UPI/Card) and complete using test flow.
              </p>
            )}
            <p className="title">Delivery Information</p>
            <div className="multi-fields">
              <input required name="firstName" value={data.firstName} onChange={onChangeHandler} type="text" placeholder="First name" />
              <input required name="lastName" value={data.lastName} onChange={onChangeHandler} type="text" placeholder="Last name" />
            </div>
            <input required name="email" value={data.email} onChange={onChangeHandler} type="email" placeholder="Email Address" />
            <input required name="street" value={data.street} onChange={onChangeHandler} type="text" placeholder="Street" />
            <div className="multi-fields">
              <input required name="city" value={data.city} onChange={onChangeHandler} type="text" placeholder="City" />
              <input required name="state" value={data.state} onChange={onChangeHandler} type="text" placeholder="State" />
            </div>
            <div className="multi-fields">
              <input required name="zipcode" value={data.zipcode} onChange={onChangeHandler} type="text" placeholder="Zip Code" />
              <input required name="country" value={data.country} onChange={onChangeHandler} type="text" placeholder="Country" />
            </div>
            <input required name="phone" value={data.phone} onChange={onChangeHandler} type="tel" placeholder="Phone" />
          </div>
          <div className="place-order-right">
            <div className="cart-total">
              <h2>Cart Totals</h2>
              <div className="payment-method-selector">
                <button
                  type="button"
                  className={paymentMethod === "online" ? "pm-btn active" : "pm-btn"}
                  aria-pressed={paymentMethod === "online"}
                  onClick={() => {
                    setPaymentMethod("online");
                    initiatePayment();
                  }}
                >
                  Pay Online
                </button>
                <button
                  type="button"
                  className={paymentMethod === "cod" ? "pm-btn active" : "pm-btn"}
                  aria-pressed={paymentMethod === "cod"}
                  onClick={() => setPaymentMethod("cod")}
                >
                  Cash on Delivery
                </button>
              </div>
              <div>
                <div className="cart-total-details">
                  <p>Subtotal</p>
                  <p>?{getTotalCartAmount()}</p>
                </div>
                <hr />
                <div className="cart-total-details">
                  <p>Delivery Fee</p>
                  <p>?{getTotalCartAmount() === 0 ? 0 : 2}</p>
                </div>
                <hr />
                <div className="cart-total-details">
                  <b>Total</b>
                  <b>?{getTotalCartAmount() === 0 ? 0 : getTotalCartAmount() + 2}</b>
                </div>
              </div>
              <button type="submit" disabled={isProcessing} className="payment-submit-btn">
                {isProcessing
                  ? "PROCESSING..."
                  : paymentMethod === "cod"
                  ? "PLACE COD ORDER"
                  : "PROCEED TO PAYMENT"}
              </button>
              {isTestMode && (
                <p className="test-mode-help-inline">
                  Test tip: QR may fail on real UPI apps in test mode.
                </p>
              )}
            </div>
          </div>
        </form>
      )}
    </>
  );
};

export default PlaceOrder;

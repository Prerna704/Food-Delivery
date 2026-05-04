import React, { useContext, useEffect, useState } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';

const PlaceOrder = () => {
  const navigate = useNavigate();
  const { getTotalCartAmount, token, food_list, cartItems, url } = useContext(StoreContext);
  
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

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData((data) => ({ ...data, [name]: value }));
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

  const initiatePayment = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    
    try {
      // Prepare order items
      const orderItems = [];
      food_list.forEach((item) => {
        if (cartItems[item._id] > 0) {
          orderItems.push({
            id: item._id,
            name: item.name,
            price: item.price,
            quantity: cartItems[item._id]
          });
        }
      });

      const subtotal = getTotalCartAmount();
      const deliveryFee = subtotal === 0 ? 0 : 2;
      const totalAmount = (subtotal + deliveryFee) * 100; // Convert to paise

      // Create Razorpay order
      const orderResponse = await axios.post(
        `${url}/api/order/create-order`,
        { amount: totalAmount },
        { headers: { token } }
      );

      const payload = orderResponse.data?.data || orderResponse.data || {};
      const orderId = payload.id || payload.orderId || payload.order_id;
      const amount = payload.amount;
      const currency = payload.currency || "INR";
      const key = payload.key || import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!window.Razorpay) {
        toast.error("Razorpay SDK not loaded. Please refresh and try again.");
        setIsProcessing(false);
        return;
      }

      if (!orderId || !key) {
        console.error("Invalid create-order response:", orderResponse.data);
        toast.error("Payment setup failed. Missing order/key from server.");
        setIsProcessing(false);
        return;
      }

      const options = {
        key,
        amount: amount,
        currency: currency,
        name: "Food Delivery App",
        description: "Order Payment",
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
            // Verify payment
            const verifyResponse = await axios.post(
              `${url}/api/order/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData: {
                  address: data,
                  items: orderItems,
                  amount: (subtotal + deliveryFee),
                }
              },
              { headers: { token } }
            );

            if (verifyResponse.data.success) {
              toast.success("Payment successful! Order placed.");
              // Clear cart from localStorage
              localStorage.removeItem("cartItems");
              // If you have a context method to clear cart, call it here
              // For example: clearCart();
              navigate("/myorders");
            } else {
              toast.error("Payment verification failed");
            }
          } catch (error) {
            console.error("Verification error:", error);
            toast.error("Payment verification failed");
          } finally {
            setIsProcessing(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
      razorpay.on('payment.failed', (response) => {
        console.error("Payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });

    } catch (error) {
      console.error("Payment initiation error:", error);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Payment initialization failed"
      );
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

  return (
    <form className="place-order" onSubmit={(e) => { e.preventDefault(); initiatePayment(); }}>
      <div className="place-order-left">
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
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>₹{getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>₹{getTotalCartAmount() === 0 ? 0 : 2}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <b>Total</b>
              <b>₹{getTotalCartAmount() === 0 ? 0 : getTotalCartAmount() + 2}</b>
            </div>
          </div>
          <button type="submit" disabled={isProcessing}>
            {isProcessing ? "PROCESSING..." : "PROCEED TO PAYMENT"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PlaceOrder;

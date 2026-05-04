import React, { useContext, useEffect, useState } from "react";
import "./MyOrders.css";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { assets } from "../../assets/frontend_assets/assets";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";

const MyOrders = () => {
  const { url, token } = useContext(StoreContext);
  const [data, setData] = useState([]);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") === "history" ? "history" : "active");
  const navigate = useNavigate();

  const fetchOrders = async () => {
    const response = await axios.post(
      url + "/api/order/userorders",
      {},
      { headers: { token } }
    );
    if (response.data.success) {
      setData(response.data.data);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
    } else {
      setData([]);
      toast.error("Please login first");
      navigate("/");
    }
  }, [token, navigate]);

  const activeOrders = data.filter((order) => order.status !== "Delivered");
  const historyOrders = data.filter((order) => order.status === "Delivered");
  const ordersToShow = tab === "active" ? activeOrders : historyOrders;

  return (
    <div className="my-orders">
      <h2>Orders</h2>
      <div className="orders-tabs">
        <button
          className={tab === "active" ? "tab-btn active" : "tab-btn"}
          onClick={() => setTab("active")}
        >
          Active Orders
        </button>
        <button
          className={tab === "history" ? "tab-btn active" : "tab-btn"}
          onClick={() => setTab("history")}
        >
          Order History
        </button>
      </div>
      <div className="container">
        {ordersToShow.map((order, index) => {
          return (
            <div key={index} className="my-orders-order">
              <img src={assets.parcel_icon} alt="" />
              <p>
                {order.items.map((item, index) => {
                  if (index === order.items.length - 1) {
                    return item.name + " X " + item.quantity;
                  } else {
                    return item.name + " X " + item.quantity + ",";
                  }
                })}
              </p>
              <p>₹{order.amount}.00</p>
              <p>items: {order.items.length}</p>
              <p>
                <span>&#x25cf;</span>
                <b> {order.status}</b>
              </p>
              {/* <button onClick={fetchOrders}>Track Order</button> */}
              <button onClick={() => alert("Order Status: " + order.status)}>
                Track Order
              </button>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyOrders;

import React, { useContext, useEffect } from "react";
import "./Login.css";
import { useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { StoreContext } from "../../context/StoreContext";
import {useNavigate } from "react-router-dom";

const Login = ({ url }) => {
  const navigate=useNavigate();
  const {admin,setAdmin,token, setToken } = useContext(StoreContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState({
    email: "",
    password: "",
  });
  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData((data) => ({ ...data, [name]: value }));
  };
  const onLogin = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await axios.post(url + "/api/user/login", data, { timeout: 15000 });
      if (response.data.success) {
        if (response.data.role === "admin") {
          setToken(response.data.token);
          setAdmin(true);
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("admin", "true");
          toast.success("Login Successfully");
          navigate("/add");
        }else{
          toast.error("You are not an admin");
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed, please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  useEffect(()=>{
    if(admin && token){
       navigate("/add");
    }
  },[])
  return (
    <div className="login-popup">
      <form onSubmit={onLogin} className="login-popup-container">
        <div className="login-popup-title">
          <h2>Login</h2>
        </div>
        <div className="login-popup-inputs">
          <input
            name="email"
            onChange={onChangeHandler}
            value={data.email}
            type="email"
            placeholder="Your email"
            required
          />
          <input
            name="password"
            onChange={onChangeHandler}
            value={data.password}
            type="password"
            placeholder="Your password"
            required
          />
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;

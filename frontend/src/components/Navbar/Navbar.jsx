import React, { useContext } from "react";
import "./Navbar.css";
import { assets } from "../../assets/frontend_assets/assets";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { StoreContext } from "../../context/StoreContext";
import { toast } from "react-toastify";

const Navbar = ({ setShowLogin }) => {
  const { getTotalCartAmount, token, setToken } = useContext(StoreContext);
  const navigate=useNavigate();
  const location = useLocation();
  const isCheckoutNav =
    location.pathname === "/cart" ||
    location.pathname === "/order" ||
    location.pathname === "/myorders";

  const isActive = (pathKey) => {
    if (pathKey === "home") return location.pathname === "/";
    if (pathKey === "cart") return location.pathname === "/cart";
    if (pathKey === "orders") return location.pathname === "/myorders";
    if (pathKey === "order") return location.pathname === "/order";
    return false;
  };

  const logout=()=>{
    localStorage.removeItem("token");
    setToken("");
    toast.success("Logout Successfully")
    navigate("/");
  }
  return (
    <div className="navbar">
      <Link to="/">
        <img src={assets.logo} alt="" className="logo" />
      </Link>
      <ul className="navbar-menu">
        <Link
          to="/"
          className={isActive("home") ? "active" : ""}
        >
          home
        </Link>
        {isCheckoutNav ? (
          <>
            <Link
              to="/cart"
              className={isActive("cart") ? "active" : ""}
            >
              add to cart
            </Link>
            <Link
              to="/myorders"
              className={isActive("orders") ? "active" : ""}
            >
              order
            </Link>
          </>
        ) : (
          <>
            <a
              href="#explore-menu"
              className=""
            >
              menu
            </a>
            <a
              href="#app-download"
              className=""
            >
              mobile-app
            </a>
            <a
              href="#footer"
              className=""
            >
              contact us
            </a>
          </>
        )}
      </ul>
      <div className="navbar-right">
        <img src={assets.search_icon} alt="" />
        <div className="navbar-search-icon">
          <Link to="/cart">
            <img src={assets.basket_icon} alt="" />
          </Link>
          <div className={getTotalCartAmount() === 0 ? "" : "dot"}></div>
        </div>
        {!token ? (
          <button onClick={() => setShowLogin(true)}>sign in</button>
        ) : (
          <div className="navbar-profile">
            <img src={assets.profile_icon} alt="" />
            <ul className="nav-profile-dropdown">
              <li onClick={()=>navigate("/myorders")}><img src={assets.bag_icon} alt="" /><p>Orders</p></li>
              <hr />
              <li onClick={logout}><img src={assets.logout_icon} alt="" /><p>Logout</p></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;

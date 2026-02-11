import React from "react";
import "./Header.css";

const Header = () => {
  return (
    <div className="header">
      <div className="header-contents">
        <h2>Order your favourite food here</h2>
        <p>
          Hungry? Perfect. Our kitchen is armed with bold flavors, fresh ingredients, and zero boring dishes. One visit, and your cravings will start trusting us blindly.Our chefs don’t play safe — they play tasty. Expect big flavors, fresh ingredients, and the kind of meals that make you forget you ever said “I’ll eat light today.”
        </p>
        <button>View Menu</button>
      </div>
    </div>
  );
};

export default Header;

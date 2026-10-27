import React, { useEffect, useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import usefetchcart from "./customhooks/usefetchcart";
import { UserContext } from "../App";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import "./Cart.css";
import { Helmet } from "react-helmet";

const Cart = () => {
  const {
    cartdata,
    loading,
    coupon,
    fetchcart,
    email
  } = usefetchcart();

  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [promo, setPromo] = useState("");
  const [updating, setUpdating] = useState(false);

  // ================= LOGIN CHECK =================
  useEffect(() => {
    const uinfo = JSON.parse(localStorage.getItem("uinfo"));
    const token = localStorage.getItem("token");

    if (!uinfo || !token) {
      toast.warning("Please login to view your cart");
      navigate("/login", {
        state: {
          from: "/cart"
        }
      });
    }
  }, [navigate]);

  const promoApplied = !!coupon?.code;

  // ================= APPLY PROMO =================
  const handleApplyPromo = async (e) => {
    e.preventDefault();

    const enteredCode = promo.trim().toUpperCase();

    if (!enteredCode) {
      return toast.warning("Please enter a promo code.");
    }

    if (coupon?.code === enteredCode) {
      return toast.info("This promo code is already applied.");
    }

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_APIURL}/api/apply-coupon`,
        {
          email,
          coupon: enteredCode
        }
      );

      if (res.status === 200) {
        toast.success("Promo applied successfully!");
        setPromo("");
        fetchcart();           // Refresh cart to get updated coupon
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply coupon.");
    }
  };

  // ================= REMOVE PROMO =================
  const handleRemovePromo = async () => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_APIURL}/api/remove-coupon`,
        { email }
      );

      if (res.status === 200) {
        toast.success("Coupon removed");
        fetchcart();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove coupon.");
    }
  };

  // ================= UPDATE QTY =================
  const handleQtyChange = async (index, value) => {
    const updatedQty = parseInt(value);

    if (!updatedQty || updatedQty < 1) return;

    const item = cartdata[index];

    try {
      setUpdating(true);

      const res = await axios.put(
        `${process.env.REACT_APP_APIURL}/api/updatecart`,
        {
          email,
          productId: item.productId,
          variantId: item.variantId,
          quantity: updatedQty,
        }
      );

      if (res.status === 200) {
        toast.success("Cart updated");
        fetchcart();
      } else {
        toast.error("Failed to update cart");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating cart");
    } finally {
      setUpdating(false);
    }
  };

  // ================= REMOVE ITEM =================
  const handleRemove = async (item) => {
    try {
      const res = await axios.delete(
        `${process.env.REACT_APP_APIURL}/api/removefromcart`,
        {
          data: {
            email,
            productId: item.productId,
            variantId: item.variantId,
          },
        }
      );

      if (res.status === 200) {
        toast.success("Item removed from cart");
        fetchcart();
      } else {
        toast.error("Failed to remove item");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error removing item");
    }
  };

  // ================= CALCULATIONS =================
  const subtotal = cartdata.reduce(
    (sum, item) => sum + (item.originalPrice || item.discountPrice || 0) * item.quantity,
    0
  );

  const totalBeforePromo = cartdata.reduce(
    (sum, item) => sum + (item.discountPrice || 0) * item.quantity,
    0
  );

  let couponDiscount = 0;

  if (coupon?.discountValue) {
    if (coupon.discountType === "percent") {
      couponDiscount = (totalBeforePromo * coupon.discountValue) / 100;

      if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
        couponDiscount = coupon.maxDiscount;
      }
    } else {
      couponDiscount = coupon.discountValue;
    }
  }

  const finalTotal = Math.max(0, totalBeforePromo - couponDiscount);
  const youSaved = subtotal - finalTotal;

  return (
    <>
      <Helmet>
        <title>Shopping Cart | Prime Shoes</title>
        <meta
          name="description"
          content="View and manage your shopping cart at Prime Shoes."
        />
        <meta
          name="keywords"
          content="cart, checkout, shoes"
        />
      </Helmet>

      <div className="pcart-container">

        {/* HEADER */}
        <div className="pcart-header">
          {cartdata.length > 0 && (
            <h2>
              Shopping Cart ({cartdata.length} item{cartdata.length > 1 ? "s" : ""})
            </h2>
          )}

          {cartdata.length > 0 && (
            <Link to="/products" className="pcart-shopmore-btn">
              Shop More & Explore
            </Link>
          )}
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <>
            <div className="pcart-table-wrapper">
              <div className="pcart-skeleton-table">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="pcart-skeleton-row">
                    <div className="pcart-skeleton-img skeleton"></div>
                    <div className="pcart-skeleton-details">
                      <div className="skeleton skeleton-title"></div>
                      <div className="skeleton skeleton-text"></div>
                      <div className="skeleton skeleton-text short"></div>
                    </div>
                    <div className="skeleton skeleton-price"></div>
                    <div className="skeleton skeleton-price"></div>
                    <div className="skeleton skeleton-qty"></div>
                    <div className="skeleton skeleton-price"></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pcart-bottom">
              <div className="pcart-promo">
                <div className="skeleton skeleton-heading"></div>
                <div className="skeleton skeleton-input"></div>
              </div>
              <div className="pcart-totals">
                <div className="skeleton skeleton-heading"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-btn"></div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* EMPTY STATE */}
            {cartdata.length === 0 ? (
              <div className="pcart-empty-state">
                <img
                  src="/img/cart.png"
                  alt="Empty Cart"
                  className="pcart-empty-image"
                />
                <h3>Your Cart is Empty</h3>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <Link to="/products" className="pcart-empty-btn">
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <>
                {/* TABLE */}
                <div className="pcart-table-wrapper">
                  <table className="pcart-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Discount</th>
                        <th>Quantity</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {cartdata.map((item, index) => (
                        <tr key={item.variantId} className="pcart-item">
                          <td className="pcart-product">
                            <img
                              src={
                                item?.image?.url
                                  ? item.image.url
                                  : `/uploads/${item.image}`
                              }
                              alt={item.title}
                              className="pcart-product-img"
                            />

                            <div className="pcart-product-details">
                              <h5>{item.title}</h5>
                              {item.color && (
                                <p style={{ fontSize: "13px", margin: "2px 0" }}>
                                  Color: {item.color}
                                </p>
                              )}
                              {item.size && (
                                <p style={{ fontSize: "13px", margin: "2px 0" }}>
                                  Size: {item.size}
                                </p>
                              )}
                              <div className="pcart-rating">
                                {[...Array(5)].map((_, i) => (
                                  <FaStar key={i} color="#ffc107" style={{ fontSize: "12px" }} />
                                ))}
                              </div>
                            </div>
                          </td>

                          <td className="pcart-price">
                            <span className="pcart-original">
                              ₹{item.originalPrice || item.price}
                            </span>
                          </td>

                          <td className="pcart-price-discount">
                            ₹{item.discountPrice}
                          </td>

                          <td className="pcart-quantity">
                            <div className="pcart-qty-controls">
                              <button
                                disabled={updating}
                                onClick={() =>
                                  handleQtyChange(
                                    index,
                                    item.quantity > 1 ? item.quantity - 1 : 1
                                  )
                                }
                              >
                                −
                              </button>

                              <input type="text" readOnly value={item.quantity} />

                              <button
                                disabled={updating}
                                onClick={() => handleQtyChange(index, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="pcart-total">
                            ₹{(item.discountPrice * item.quantity).toFixed(2)}
                          </td>

                          <td className="pcart-remove">
                            <span onClick={() => handleRemove(item)}>
                              &times;
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* BOTTOM SECTION */}
                <div className="pcart-bottom">

                  {/* COUPON SECTION */}
                  <div className="pcart-promo">
                    <h4>Discount Codes</h4>

                    <form onSubmit={handleApplyPromo}>
                      <input
                        type="text"
                        placeholder="Enter your coupon code"
                        value={promo}
                        onChange={(e) => setPromo(e.target.value)}
                        disabled={promoApplied}
                      />

                      <button type="submit" disabled={promoApplied}>
                        {promoApplied ? "Applied" : "Apply"}
                      </button>
                    </form>

                    {promoApplied && coupon && (
                      <div className="pcart-promo-success">
                        <p>
                          Coupon <strong>{coupon.code}</strong> applied successfully
                        </p>
                        <button 
                          className="remove-coupon-btn"
                          onClick={handleRemovePromo}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* TOTALS */}
                  <div className="pcart-totals">
                    <h4>Cart Totals</h4>

                    <ul>
                      <li>
                        Subtotal
                        <span>₹{subtotal.toFixed(2)}</span>
                      </li>

                      {couponDiscount > 0 && (
                        <li>
                          Exclusive Discount
                          <span className="pcart-discount">
                            -₹{couponDiscount.toFixed(2)}
                          </span>
                        </li>
                      )}

                      <li>
                        You Saved
                        <span>₹{youSaved.toFixed(2)}</span>
                      </li>

                      <li className="pcart-total-line">
                        Total
                        <span>₹{finalTotal.toFixed(2)}</span>
                      </li>
                    </ul>

                    <button
                      className="pcart-checkout-btn"
                      onClick={() => {
                        sessionStorage.removeItem("buyNowMode");
                        sessionStorage.removeItem("buyNowItem");

                        navigate("/checkout", {
                          state: {
                            cartdata,
                            email,
                            finalTotal,
                            subtotal,
                            couponDiscount,
                            totalBeforePromo,
                            coupon,           // Passing full coupon object
                          },
                        });
                      }}
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Cart;
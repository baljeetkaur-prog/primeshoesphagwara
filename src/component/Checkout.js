import React from "react";
import Instagram from "./Instagram";
import { useEffect, useState, useContext } from "react";
import { dataContext, UserContext } from "../App"; // if email is stored there
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { Country, State } from "country-state-city";
import { Helmet } from "react-helmet";
import "./Checkout.css"; 
import { FaPhoneAlt } from "react-icons/fa";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Checkout = () => {
const [cartItems, setCartItems] = useState([]);
const [totalBefore, setTotalBefore] = useState(0);
const [totalAfter, setTotalAfter] = useState(0);
const [promoDiscount, setPromoDiscount] = useState(0);
const [finalTotal, setFinalTotal] = useState(0);
const { user } = useContext(UserContext);
const { setitemcount } = useContext(dataContext);
const [deliveryCharge, setDeliveryCharge] = useState(0);
const navigate=useNavigate(); 
const [showPassword, setShowPassword] = useState(false);
const [loading, setLoading] = useState(false);
const [billingDetails, setBillingDetails] = useState({
  firstName: "",
  lastName: "",
  country: "IN",
  address: "",
  apartment: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: user?.email || "",
  note: "",
});
const [accountPassword, setAccountPassword] = useState("");
const [paymentMode, setPaymentMode] = useState("razorpay"); // "online" or "cod"
const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(false);
  

const API=process.env.REACT_APP_APIURL; 
useEffect(() => {
  const isBuyNowMode = sessionStorage.getItem("buyNowMode") === "true";
  const buyNowItemRaw = sessionStorage.getItem("buyNowItem");



 if (isBuyNowMode && buyNowItemRaw) {
  try {
    const item = JSON.parse(buyNowItemRaw);
    setCartItems([item]);

    const qty = Number(item.quantity || 1);
    const orig = Number(item.originalPrice || 0);
    const disc = Number(item.discountPrice || orig);

    setTotalBefore(orig * qty);
    setTotalAfter(disc * qty);
    setPromoDiscount(0);
    setFinalTotal(disc * qty);
  } catch (e) {
    console.error("BuyNow parse error");
    setCartItems([]);
  }
} else if (user?.email) {
  const fetchCart = async () => {
    try {
      const res = await axios.get(`${API}/api/fetchcart/${user.email}`);
      
      const data = res.data || {};
      const items = Array.isArray(data.cart) ? data.cart : [];

      setCartItems(items);

      // ✅ FIXED - Match with backend response
      setTotalBefore(Number(data.totalBeforePromo || data.subtotal || 0));
      setTotalAfter(Number(data.totalBeforePromo || 0));
      setPromoDiscount(Number(data.couponDiscount || 0));
      setFinalTotal(Number(data.finalTotal || 0));

    } catch (err) {
      console.error("Checkout fetch error:", err);
      // Set safe defaults on error
      setCartItems([]);
      setTotalBefore(0);
      setTotalAfter(0);
      setPromoDiscount(0);
      setFinalTotal(0);
    }
  };

  fetchCart();
}
}, [user?.email]);
  const handleSaveNewAddress = async () => {
    try {
      await axios.post(`${API}/api/addresses`, {
        email: user.email,
        ...billingDetails,
        isDefault: true,
      });
      toast.success("Address saved successfully!");
      setShowNewAddressForm(false);
      window.location.reload(); // Refresh addresses
    } catch (err) {
      toast.error("Failed to save address");
    }
  };



const handlePlaceOrder = async (e) => {
  e.preventDefault();
  if (loading) return;
  setLoading(true);

  const isBuyNowMode = sessionStorage.getItem("buyNowMode") === "true";
  const buyNowItemRaw = sessionStorage.getItem("buyNowItem");
  const buyNowItem = isBuyNowMode && buyNowItemRaw ? JSON.parse(buyNowItemRaw) : null;

  if (!paymentMode) {
    toast.error("Please select a payment method.");
    setLoading(false);
    return;
  }

  const requiredFields = [
    "firstName", "lastName", "country", "address", "city", "state", "zip", "phone", "email"
  ];
  const allRequiredFilled = requiredFields.every(field => billingDetails[field]?.trim());

  if (!allRequiredFilled || !accountPassword) {
    toast.error("Please fill in all required fields including password.");
    setLoading(false);
    return;
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(billingDetails.phone)) {
    toast.error("Please enter a valid 10-digit phone number.");
    setLoading(false);
    return;
  }

  const zipRegex = /^[0-9]{5,6}$/;
  if (!zipRegex.test(billingDetails.zip)) {
    toast.error("Please enter a valid zip code (5-6 digits).");
    setLoading(false);
    return;
  }

  // ====================== SAVE ADDRESS IF CHECKED ======================
  if (saveAddressForFuture) {
    try {
      await axios.post(`${API}/api/addresses`, {
        email: user.email,
        ...billingDetails,
        isDefault: false,        // Change to true if you want it as default
      });
      // toast.success("Address saved for future use"); // Optional
    } catch (err) {
      console.warn("Failed to save address for future use", err);
      // Do NOT block the order if saving address fails
    }
  }
  // ===================================================================

  // ✅ COD Flow
  // if (paymentMode === "cod") {
  //   try {
  //     const res = await axios.post(`${API}/api/placeorder`, {
  //       email: user.email,
  //       billingDetails,
  //       password: accountPassword,
  //       paymentMode,
  //       note: billingDetails.note,
  //       deliveryCharge, 
  //       ...(buyNowItem && { buyNowItem })
  //     });

  //     const order = res.data?.order;

  //     toast.success("Order Placed Successfully");
      
  //     // ... rest of your COD success logic
  //     setCartItems([]);
  //     setitemcount(0);
  //     sessionStorage.removeItem("buyNowItem");
  //     sessionStorage.removeItem("buyNowMode");

  //     setBillingDetails({ /* reset */ });
  //     setAccountPassword("");
  //     setPaymentMode("");
  //     setTotalBefore(0);
  //     setTotalAfter(0);
  //     setPromoDiscount(0);
  //     setFinalTotal(0);

  //     if (order) {
  //       navigate("/thankyou", { state: { orderNumber: order.orderNumber } });
  //     }

  //   } catch (err) {
  //     console.error("Place order error (COD):", err);
  //     toast.error(err.response?.data?.message || "Something went wrong.");
  //   } finally {
  //     setLoading(false);
  //   }

  //   return;
  // }

  // ✅ Razorpay Flow

  // Razorpay Flow
  if (paymentMode === "razorpay") {
    try {
      // 1. Validate user credentials and order
      await axios.post(`${API}/api/validate-order`, {
        email: user.email,
        password: accountPassword,
        buyNowItem,
      });

      // 2. Create the database order BEFORE payment
      const placeOrderRes = await axios.post(`${API}/api/placeorder`, {
        email: user.email,
        billingDetails,
        password: accountPassword,
        paymentMode,
        note: billingDetails.note,
        ...(buyNowItem && { buyNowItem }),
      });

      const order = placeOrderRes.data?.order;

      if (!order?._id) {
        throw new Error("Database order could not be created.");
      }

      // 3. Create Razorpay order using the database order ID
      const createOrderRes = await axios.post(
        `${API}/api/create-razorpay-order`,
        { orderId: order._id }
      );

      const razorpayOrder = createOrderRes.data;

      const razorpayLoaded = await loadRazorpayScript();

      if (!razorpayLoaded) {
        toast.error("Failed to load Razorpay.");
        setLoading(false);
        return;
      }

      // 4. Open Razorpay checkout
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.id,
        name: "PrimeShoes",
        description: "Order Payment",
        image: "/logo192.png",

        handler: async function (response) {
          try {
            // 5. Verify payment against the existing database order
            const verifyRes = await axios.post(
              `${API}/api/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: order._id,
              }
            );

            if (verifyRes.data.success) {
              toast.success("Payment verified and order confirmed.");

              setCartItems([]);
              setitemcount(0);
              sessionStorage.removeItem("buyNowItem");
              sessionStorage.removeItem("buyNowMode");

              setBillingDetails({ /* reset */ });
              setAccountPassword("");
              setPaymentMode("");
              setTotalBefore(0);
              setTotalAfter(0);
              setPromoDiscount(0);
              setFinalTotal(0);

           navigate("/thankyou", {
  state: {
    orderId: order._id,
    orderNumber: order.orderNumber,
  },
});
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (err) {
            console.error("Payment verification error:", err);
            toast.error(
              err.response?.data?.message ||
              "Payment verification failed. Please contact support if money was deducted."
            );
          } finally {
            setLoading(false);
          }
        },

  
modal: {
  ondismiss: function () {
    setLoading(false);

    toast.info(
      "Payment was cancelled. You can retry payment from your pending order."
    );
  },
},


        prefill: {
          name: `${billingDetails.firstName} ${billingDetails.lastName}`,
          email: billingDetails.email,
          contact: billingDetails.phone,
        },

        theme: { color: "#f44" },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response.error);
        toast.error(
          response.error?.description || "Payment failed. Please try again."
        );
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      console.error("Error initiating Razorpay payment:", err);
      toast.error(
        err.response?.data?.message ||
        err.message ||
        "Could not initiate payment."
      );
      setLoading(false);
    }

    return;
  }

};


const calculateTotals = (items) => {
  let totalBefore = 0;
  let totalAfter = 0;
  let promoDiscount = 0;

  items.forEach(item => {
    const price = item.discountPrice ?? item.originalPrice;
    const quantity = item.quantity ?? 1;

    totalBefore += item.originalPrice * quantity;
    totalAfter += price * quantity;

    if (item.coupon) {
  const discount = item.coupon.type === "percent"
  ? (price * item.coupon.amount / 100)
  : item.coupon.amount;
      promoDiscount += discount * quantity;
    }
  });

  const finalTotal = Math.max(0, totalAfter - promoDiscount);

  // Update state
  setTotalBefore(totalBefore);
  setTotalAfter(totalAfter);
  setPromoDiscount(promoDiscount);
  setFinalTotal(finalTotal);
};
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

useEffect(() => {
  if (cartItems.length === 0) {
    setDeliveryCharge(0);
    return;
  }

  const city = billingDetails.city?.trim().toLowerCase() || "";
  const state = billingDetails.state?.trim().toLowerCase() || "";

  let charge = 75;

  const isPhagwaraPunjab =
    city === "phagwara" && state === "punjab";

  if (isPhagwaraPunjab && finalTotal >= 1000) {
    charge = 0;
  } else {
    const hillyStates = [
      "himachal pradesh",
      "uttarakhand",
      "jammu and kashmir",
      "jammu & kashmir",
      "ladakh",
      "sikkim",
      "arunachal pradesh",
    ];

    if (hillyStates.includes(state)) {
      charge = 95;
    }
  }

  setDeliveryCharge(charge);
}, [cartItems, billingDetails.city, billingDetails.state, finalTotal]);

  // Fetch Saved Addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user?.email) return;
      try {
        const res = await axios.get(`${API}/api/addresses?email=${user.email}`);
        setSavedAddresses(res.data.addresses || []);

        const defaultAddr = res.data.addresses.find(a => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr._id);
          setBillingDetails({
            firstName: defaultAddr.firstName,
            lastName: defaultAddr.lastName,
            country: defaultAddr.country,
            address: defaultAddr.addressLine1,
            apartment: defaultAddr.addressLine2 || "",
            city: defaultAddr.city,
            state: defaultAddr.state,
            zip: defaultAddr.zip,
            phone: defaultAddr.phone,
            email: user.email,
            note: billingDetails.note,
          });
        } else if (res.data.addresses.length === 0) {
          setShowNewAddressForm(true);
        }
      } catch (err) {
        console.error("Failed to load addresses", err);
      }
    };

    fetchAddresses();
  }, [user, API]);




  return (
    <>
     <Helmet>
    <title>Checkout | Prime Shoes</title>
    <meta
      name="description"
      content="Securely place your order at Prime Shoes. Enter billing details, apply promo codes, choose payment method, and complete your purchase with ease."
    />
    <meta
      name="keywords"
      content="Prime Shoes checkout, place order, billing details, promo codes, online payment, cash on delivery, footwear shopping, handbags, accessories"
    />
  </Helmet>
   <div className="custom-breadcrumb">
  <div className="breadcrumb-container">
    <div className="breadcrumb-links">
      <Link to="/"><i className="fa fa-home"></i> Home</Link>
      <span>Checkout</span>
    </div>
  </div>
</div>

      <section className="checkout spad" style={{borderBottom:'1px solid #000'}}>
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
             <h6 className="coupon__link" style={{ marginBottom: "25px" }}>
  <span className="icon_tag_alt"></span>&nbsp; 
  Use a valid promo code in cart to unlock exclusive discounts.
</h6>
            </div>
          </div>

         <form className="checkout__form" onSubmit={handlePlaceOrder}>

            <div className="row">
          <div className="col-lg-8">
  <h5>Billing Details</h5>

{savedAddresses.length > 0 && (
  <div className="saved-addresses">
    <h6 className="mb-3">Select Delivery Address</h6>
    
    <div className="address-list">
      {savedAddresses.map((addr) => (
        <div
          key={addr._id}
          className={`address-card ${selectedAddressId === addr._id ? 'selected' : ''}`}
          onClick={() => {
            setSelectedAddressId(addr._id);
            setBillingDetails({
              firstName: addr.firstName,
              lastName: addr.lastName,
              country: addr.country,
              address: addr.addressLine1,
              apartment: addr.addressLine2 || "",
              city: addr.city,
              state: addr.state,
              zip: addr.zip,
              phone: addr.phone,
              email: user?.email || "",
              note: billingDetails.note,
            });
          }}
        >
          <input 
            type="radio" 
            checked={selectedAddressId === addr._id} 
            readOnly 
            className="address-radio"
          />
          
          <div className="address-info">
            <div className="address-header">
              <strong>{addr.firstName} {addr.lastName}</strong>
              {addr.isDefault && <span className="default-badge">Default</span>}
            </div>
            
            <div className="address-body">
              {addr.addressLine1}{addr.addressLine2 && `, ${addr.addressLine2}`}<br />
              {addr.city}, {addr.state} - {addr.zip}<br />
              
              <span className="phone">
                <FaPhoneAlt className="phone-icon" /> {addr.phone}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>

    <button
      type="button"
      className="btn btn-outline add-new-btn"
      onClick={() => setShowNewAddressForm(!showNewAddressForm)}
    >
      {showNewAddressForm ? "← Use Saved Address" : "+ Add New Delivery Address"}
    </button>
  </div>
)}

  {/* ==================== BILLING FORM (Shown only when adding new address) ==================== */}
  {(showNewAddressForm || savedAddresses.length === 0) && (
    <div className="row">
      {/* First Name */}
      <div className="col-lg-6">
        <div className="checkout__form__input">
          <p>First Name <span>*</span></p>
          <input
            type="text"
            value={billingDetails.firstName}
            onChange={(e) => setBillingDetails({ ...billingDetails, firstName: e.target.value })}
          />
        </div>
      </div>

      {/* Last Name */}
      <div className="col-lg-6">
        <div className="checkout__form__input">
          <p>Last Name <span>*</span></p>
          <input
            type="text"
            value={billingDetails.lastName}
            onChange={(e) => setBillingDetails({ ...billingDetails, lastName: e.target.value })}
          />
        </div>
      </div>

      {/* Country */}
      <div className="col-lg-12">
        <div className="checkout__form__input">
          <p>Country <span>*</span></p>
          <select
            value={billingDetails.country}
            onChange={(e) => 
              setBillingDetails({
                ...billingDetails,
                country: e.target.value,
                state: "",
              })
            }
          >
            <option value="">Select Country</option>
            {Country.getAllCountries().map((c) => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Address */}
        <div className="checkout__form__input">
          <p>Address <span>*</span></p>
          <input
            type="text"
            value={billingDetails.address}
            onChange={(e) => setBillingDetails({ ...billingDetails, address: e.target.value })}
          />
          <input
            type="text"
            placeholder="Any apartment, suite, unit"
            value={billingDetails.apartment}
            onChange={(e) => setBillingDetails({ ...billingDetails, apartment: e.target.value })}
          />
        </div>

        {/* City */}
        <div className="checkout__form__input">
          <p>Town/City <span>*</span></p>
          <input
            type="text"
            value={billingDetails.city}
            onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
          />
        </div>

        {/* State */}
        <div className="checkout__form__input">
          <p>State <span>*</span></p>
          <select
            value={billingDetails.state}
            onChange={(e) => setBillingDetails({ ...billingDetails, state: e.target.value })}
            disabled={!billingDetails.country}
          >
            <option value="">Select State</option>
            {billingDetails.country &&
              State.getStatesOfCountry(billingDetails.country).map((s) => (
                <option key={s.isoCode} value={s.name}>{s.name}</option>
              ))}
          </select>
        </div>

        {/* Zip */}
        <div className="checkout__form__input">
          <p>Postcode/Zip <span>*</span></p>
          <input
            type="text"
            value={billingDetails.zip}
            onChange={(e) => setBillingDetails({ ...billingDetails, zip: e.target.value })}
          />
        </div>
      </div>

      {/* Phone & Email */}
      <div className="col-lg-6">
        <div className="checkout__form__input">
          <p>Phone <span>*</span></p>
          <input
            type="text"
            value={billingDetails.phone}
            onChange={(e) => setBillingDetails({ ...billingDetails, phone: e.target.value })}
          />
        </div>
      </div>
      <div className="col-lg-6">
        <div className="checkout__form__input">
          <p>Email <span>*</span></p>
          <input
            type="email"
            value={billingDetails.email}
            onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
          />
        </div>
      </div>

      {/* Save Address Button */}
     {/* Save Address for Future Use - Checkbox */}
<div className="col-lg-12 mt-3">
  <label className="save-address-checkbox">
    <input
      type="checkbox"
      checked={saveAddressForFuture}
      onChange={(e) => setSaveAddressForFuture(e.target.checked)}
    />
    <span>Save this address for future orders</span>
  </label>
</div>
    </div>
  )}

  {/* Account Password & Order Notes */}
<div className="col-lg-12">
  <div className="checkout__form__input">
    <p>Account Password <span>*</span></p>

    <div style={{ position: "relative" }}>
      <input
        type={showPassword ? "text" : "password"}
        value={accountPassword}
        onChange={(e) => setAccountPassword(e.target.value)}
        style={{
          width: "100%",
          paddingRight: "45px",
          boxSizing: "border-box",
        }}
      />

      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="password-toggle"
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  </div>

  <div className="checkout__form__input">
    <p>Order notes</p>
    <input
      type="text"
      placeholder="Any Instruction"
      value={billingDetails.note}
      onChange={(e) =>
        setBillingDetails({
          ...billingDetails,
          note: e.target.value,
        })
      }
    />
  </div>
</div>
</div>

              <div className="col-lg-4">
                <div className="checkout__order">
                  <h5>Your order</h5>
                  <div className="checkout__order__product">
  <ul>
    <li>
      <span className="top__text">Product</span>
      <span className="top__text__right">Total</span>
    </li>
{cartItems.map((item, index) => (
<li key={`${item.productId}-${item.variantId}`} className="checkout-product-item">
    <span className="product-info">
      {index + 1}. {item.title}
    {item.color ? ` / Color: ${item.color}` : ""}
{item.size ? ` / Size: ${item.size}` : ""}
      {` × ${item.quantity}`}
    </span>
    <span className="product-price">
  ₹{Number(
    ((item?.discountPrice ?? item?.originalPrice) || 0) * (item?.quantity || 1)
  ).toFixed(2)}
</span>
  </li>
))}

  </ul>
</div>

<div className="checkout__order__total">
  <ul>
    <li>
      Subtotal Before Discount
      <span>₹{Number(totalBefore || 0).toFixed(2)}</span>
    </li>
    <li>
      Promo Discount 
      <span style={{ color: "rgb(35, 187, 117)" }}>
        ₹{Number(promoDiscount || 0).toFixed(2)}
      </span>
    </li>
    <li>
      You Saved 
      <span>₹{Number((totalBefore || 0) - (finalTotal || 0)).toFixed(2)}</span>
    </li>
    
    <li>
      Delivery Charge 
      <span>
        {deliveryCharge === 0 ? (
          <span style={{ color: "rgb(35, 187, 117)" }}>Free</span>
        ) : (
          `₹${Number(deliveryCharge || 0).toFixed(2)}`
        )}
      </span>
    </li>

    {billingDetails.city?.trim().toLowerCase() === "phagwara" &&
     billingDetails.state?.trim().toLowerCase() === "punjab" &&
     deliveryCharge === 0 && (
      <p style={{
        color: "rgb(35, 187, 117)",
        fontSize: "14px",
        marginTop: "5px",
        marginBottom: "5px",
        fontWeight: "400"
      }}>
        Free delivery on orders above ₹1000 in Phagwara
      </p>
    )}

    <li>
      Total 
      <span>₹{Number((finalTotal || 0) + (deliveryCharge || 0)).toFixed(2)}</span>
    </li>
  </ul>
</div>




               <div className="checkout__order__widget">
  <label htmlFor="check-payment">
    Pay Online
    <input
      type="checkbox"
      id="check-payment"
      checked={paymentMode === "razorpay"}
onChange={() =>
  setPaymentMode(paymentMode === "razorpay" ? "" : "razorpay")
}
    />
    <span className="checkmark"></span>
  </label>

{/* 
  <label htmlFor="paypal">
    Cash On Delivery
    <input
      type="checkbox"
      id="paypal"
      checked={paymentMode === "cod"}
      onChange={() =>
        setPaymentMode(paymentMode === "cod" ? "" : "cod")
      }
    />
    <span className="checkmark"></span>
  </label> */}
</div>

                <button type="submit" className="site-btn" disabled={loading}>
  {loading ? "Placing order..." : "Place order"}
</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
};

export default Checkout;
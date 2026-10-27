import { useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { dataContext } from "../../App";

const useFetchCart = () => {
  const [cartdata, setcartdata] = useState([]);
  const [loading, setLoading] = useState(false);
  const [youSaved, setYouSaved] = useState(0);
  const [totalMRP, setTotalMRP] = useState(0);
  const [totalFinal, setTotalFinal] = useState(0);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [coupon, setCoupon] = useState(null);

  const { setcarttotal, setitemcount } = useContext(dataContext);

  // ✅ Get email from localStorage (consistent with Login & App.js)
  const getEmail = () => {
    try {
      const uinfo = JSON.parse(localStorage.getItem("uinfo"));
      return uinfo?.email || null;
    } catch (e) {
      return null;
    }
  };

  const email = getEmail();

  const fetchcart = useCallback(async () => {
    const currentEmail = getEmail();
    if (!currentEmail) {
      setcartdata([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_APIURL}/api/fetchcart/${currentEmail}`);

      if (res.status >= 200 && res.status < 300) {
        const { cart, totalBeforeDiscount, totalAfterDiscount, promoDiscount, finalTotal, coupon } = res.data;

        if (!cart || !Array.isArray(cart)) {
          setcartdata([]);
          return;
        }

        setcartdata(cart);
        setTotalMRP(totalBeforeDiscount || 0);
        setYouSaved(totalBeforeDiscount - totalAfterDiscount || 0);
        setPromoDiscount(promoDiscount || 0);
        setTotalFinal(finalTotal || 0);
        setCoupon(coupon || null);

        setcarttotal(finalTotal || 0);
        setitemcount(cart.reduce((acc, item) => acc + (item.quantity || 0), 0));
      }
    } catch (e) {
      console.error("Cart fetch error:", e);
      setcartdata([]);
      // toast.error("Failed to load cart");  // Optional: remove if too noisy
    } finally {
      setLoading(false);
    }
  }, [setcarttotal, setitemcount]);

  // ✅ Fetch cart when component mounts + when email changes
  useEffect(() => {
    fetchcart();
  }, [fetchcart]);

  return {
    cartdata,
    fetchcart,
    loading,
    email,
    youSaved,
    totalMRP,
    totalFinal,
    promoDiscount,
    coupon
  };
};

export default useFetchCart;
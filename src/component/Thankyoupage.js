
import React, { useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../App";
import { toast } from "react-toastify";
import { downloadReceipt } from "../utils/downloadReceipt";
import { FaHome, FaCheckCircle, FaFilePdf } from "react-icons/fa";
import { Helmet } from "react-helmet";

const Thankyoupage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const orderNumber = location.state?.orderNumber;
  const orderId = location.state?.orderId;

  const [downloading, setDownloading] = useState(false);

  const API = process.env.REACT_APP_APIURL;

  const handleDownloadReceipt = async () => {
    if (downloading) return;

    if (!user?.email) {
      toast.error("Please log in to download your receipt.");
      return;
    }

    setDownloading(true);

    try {
      const response = await axios.get(
        `${API}/api/uorders/${encodeURIComponent(user.email)}`
      );

      const orders = response.data?.orders || [];

      // Prefer the database ID, which uniquely identifies this order.
      const order = orders.find((item) => {
        if (orderId) {
          return String(item._id) === String(orderId);
        }

        if (orderNumber) {
          return (
            String(item.orderNumber) === String(orderNumber) ||
            `ORD-${String(item._id).slice(-6).toUpperCase()}` ===
              String(orderNumber)
          );
        }

        return false;
      });

      if (!order) {
        toast.error(
          "Order details could not be found. Please try downloading the receipt from My Orders."
        );
        return;
      }

      // Prevent generating a payment receipt for an unpaid order.
      const isPaid =
        order.isPaid === true ||
        String(order.paymentStatus || "").toLowerCase() === "paid";

      if (!isPaid) {
        toast.info(
          "Payment confirmation is not available yet. Please check My Orders."
        );
        return;
      }

      await downloadReceipt(order);
      toast.success("Your receipt has been downloaded.");
    } catch (error) {
      console.error("Receipt download error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to download your receipt. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>
          Thank You for Your Order – Prime Shoes Phagwara | Order Confirmation
        </title>

        <meta
          name="description"
          content="Thank you for your order at Prime Shoes. View your order details and download your payment receipt."
        />

        <meta
          name="keywords"
          content="Prime Shoes thank you, order confirmation, payment receipt, download receipt, my orders, online footwear shopping"
        />
      </Helmet>

      <div className="login-page">
        {/* Breadcrumb */}
        <div className="login-breadcrumb">
          <div className="container">
            <a href="/" className="text-decoration-none">
              <FaHome
                style={{
                  marginRight: "8px",
                  color: "rgb(236,108,29)",
                }}
              />
              Home
            </a>

            <span> / Thank You</span>
          </div>
        </div>

        {/* Thank You Section */}
        <section className="login-section">
          <div className="container login-container">
            <div
              className="login-card only-form text-center"
              style={{
                padding: "40px 30px",
              }}
            >
              {/* Logo */}
              <div className="login-logo mb-3">
                <img
                  src="/img/prime-logo.png"
                  alt="Prime Shoes Logo"
                />
              </div>

              {/* Success Icon */}
              <div
                style={{
                  backgroundColor: "#e7fbe9",
                  width: "70px",
                  height: "70px",
                  margin: "0 auto 20px auto",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 0 6px #d0f0d4",
                }}
              >
                <FaCheckCircle
                  size={38}
                  style={{ color: "#28a745" }}
                />
              </div>

              <h5
                style={{
                  marginBottom: "15px",
                  fontWeight: "600",
                  color: "#000",
                }}
              >
                Thank You for Your Order!
              </h5>

              {orderNumber && (
                <p
                  style={{
                    marginBottom: "15px",
                    color: "#444",
                  }}
                >
                  We've received your order.
                  <br />
                  <span style={{ fontWeight: "600" }}>
                    Order #{orderNumber}
                  </span>
                </p>
              )}

              <p
                style={{
                  marginBottom: "25px",
                  color: "#777",
                  lineHeight: "1.7",
                }}
              >
                Your order confirmation is complete. You can download
                your receipt now or view your order details in{" "}
                <strong>My Orders</strong>.
              </p>

              {/* Download Receipt Button */}
              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={downloading}
                className="login-btn"
                style={{
                  backgroundColor: "#222",
                  color: "#fff",
                  border: "none",
                  padding: "11px 22px",
                  fontSize: "14px",
                  fontWeight: "500",
                  borderRadius: "25px",
                  margin: "0 6px 12px",
                  cursor: downloading ? "wait" : "pointer",
                  opacity: downloading ? 0.7 : 1,
                }}
              >
                <FaFilePdf style={{ marginRight: "8px" }} />
                {downloading
                  ? "Preparing Receipt..."
                  : "Download Receipt (PDF)"}
              </button>

              {/* View Orders Button */}
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="login-btn"
                style={{
                  backgroundColor: "rgb(236,108,29)",
                  color: "#fff",
                  border: "none",
                  padding: "11px 24px",
                  fontSize: "15px",
                  fontWeight: "500",
                  borderRadius: "25px",
                  margin: "0 6px 12px",
                  boxShadow: "0 5px 12px rgba(202, 21, 21, 0.2)",
                  transition: "all 0.3s ease",
                }}
              >
                View My Orders
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Thankyoupage;

import React, { useEffect, useState, useContext } from 'react';
import { FaHome, FaBoxOpen, FaInfoCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Instagram from './Instagram';
import { UserContext } from '../App';
import './Orders.css';
import { toast } from 'react-toastify';
import ReturnCancelModal from './Returncancelmodal';
import { Helmet } from 'react-helmet';
import { downloadReceipt } from "../utils/downloadReceipt";

const badgeStyle = {
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'capitalize',
};
    const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

const formatINR = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
  const getOrderPriceDetails = (order) => {
  const items = order.items || [];

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.discountPrice || 0) *
        Number(item.quantity || 0),
    0
  );

  const productDiscount = items.reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        Number(item.originalPrice || 0) -
          Number(item.discountPrice || 0)
      ) *
        Number(item.quantity || 0),
    0
  );

  const deliveryCharge = Number(order.deliveryCharge || 0);
  const promoDiscount = Number(order.promoDiscount || 0);

  // Use the recorded total paid for paid orders.
  // The fallback calculates the order total if that field is unavailable.
  const totalPaid =
    order.isPaid === true
      ? Number(order.finalTotal || 0) + deliveryCharge
      : Math.max(0, subtotal - promoDiscount) + deliveryCharge;

  return {
    subtotal,
    productDiscount,
    promoDiscount,
    deliveryCharge,
    totalPaid,
  };
};

const getCoupon = (coupon) => {
  if (!coupon) return null;

  if (typeof coupon === "object") return coupon;

  try {
    return JSON.parse(coupon);
  } catch {
    return null;
  }
};



const getItemStatus = (item, order) => {
  if (item.isCancelled || item.status === "Cancelled") {
    return "Cancelled";
  }

  if (item.status === "Returned") {
    return "Returned";
  }

  if (item.status === "Return Requested") {
    return "Return Requested";
  }

  if (item.status === "Delivered") {
    return "Delivered";
  }

  return item.status || order.status || "Pending";
};


const getRefundStatus = (item) => {
  const status = item.refundStatus;

  if (!status || status === "Not Applicable") {
    return null;
  }

  return status;
};



const Orders = () => {
  const { user } = useContext(UserContext);
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const API = process.env.REACT_APP_APIURL;
  const handleDownloadReceipt = async (order) => {
  try {
    await downloadReceipt(order);
    toast.success("Receipt downloaded successfully.");
  } catch (error) {
    console.error("Receipt download error:", error);
    toast.error("Unable to download receipt. Please try again.");
  }
};
   const isMobile = useIsMobile();
   const [modalOpen, setModalOpen] = useState(false);
const [modalType, setModalType] = useState(null); 
const [activeOrder, setActiveOrder] = useState({ 
  orderId: null, 
  variantId: null,     // ← Changed from productId
  paymentMode: null   
});

const getDeliveredDate = (order, item) => {
  if (item.status !== 'Delivered') return null;

  const created = new Date(order.createdAt);

  // If the order is marked Delivered, assume delivery happened at most 7 days after creation
  // We'll use today's date if order is already delivered
  const today = new Date();
  const maxDeliveryDate = new Date(created);
  maxDeliveryDate.setDate(created.getDate() + 7);

  // Delivery cannot be in the future
  return today < maxDeliveryDate ? today : maxDeliveryDate;
};
const openModal = (orderId, variantId, type, paymentMode) => {   // ← Added variantId
  setActiveOrder({ orderId, variantId, paymentMode });
  setModalType(type);
  setModalOpen(true);
};


const handleModalSubmit = async (reason, bankDetails = null) => {
  try {
    let url = '';
    let payload = { 
      reason, 
      variantId: activeOrder.variantId   // ← Changed from productId
    };

    // Add bank details only for COD returns
    if (modalType === 'return' && activeOrder.paymentMode === 'cod' && bankDetails) {
      payload.bankDetails = bankDetails;
    }

    if (modalType === 'cancel') {
      url = `${API}/api/cancel/${activeOrder.orderId}`;
    } else if (modalType === 'return') {
      url = `${API}/api/return/${activeOrder.orderId}`;
    }

    const res = await axios.post(url, payload);

    toast.success(res.data.message);
    
    const freshOrders = await axios.get(`${API}/api/uorders/${user?.email}`);
    setOrders(freshOrders.data.orders || []);
    
  } catch (err) {
    toast.error(err.response?.data?.message || "Action failed");
  } finally {
    setModalOpen(false);
  }
};



  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${API}/api/uorders/${user?.email}`);
        setOrders(res.data.orders || []);
      } catch (err) {
        toast.error("Failed to fetch your orders.");
      }
    };

    if (user?.email) fetchOrders();
  }, [user]);

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage);
const isSameDay = (createdAt) => {
  const today = new Date();
  const createdDate = new Date(createdAt);
  return (
    today.getFullYear() === createdDate.getFullYear() &&
    today.getMonth() === createdDate.getMonth() &&
    today.getDate() === createdDate.getDate()
  );
};
const isWithinReturnPeriod = (deliveredAt, days = 5) => {
  if (!deliveredAt) return false;

  const deliveryDate = new Date(deliveredAt);
  const today = new Date();

  // Convert both to UTC midnight for accurate day difference
  const deliveryUTC = Date.UTC(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = todayUTC - deliveryUTC; // in ms
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= days;
};


const handleCancel = async (orderId) => {
  const reason = prompt("Please provide a reason for cancellation:");
  if (!reason) return;

  try {
    const res = await axios.post(`${API}/api/cancel/${orderId}`, { reason });
    toast.success(res.data.message);
    window.location.reload(); // refresh orders
  } catch (err) {
    toast.error(err.response?.data || "Cancellation failed");
  }
};

const handleReturn = async (orderId) => {
  const reason = prompt("Please provide a reason for return:");
  if (!reason) return;

  try {
    const res = await axios.post(`${API}/api/return/${orderId}`, { reason });
    toast.success(res.data.message);
    window.location.reload(); // refresh orders
  } catch (err) {
    toast.error(err.response?.data || "Return failed");
  }
};



  return (
    <>
      <Helmet>
    <title>My Orders | Prime Shoes</title>
    <meta
      name="description"
      content="View all your orders at Prime Shoes. Track your order status, return or cancel items within the allowed period, and manage your purchases easily."
    />
    <meta
      name="keywords"
      content="Prime Shoes my orders, order tracking, order status, cancel order, return order, online shopping orders, footwear orders, ecommerce orders"
    />
  </Helmet>
    <div>

      {/* Breadcrumb */}
      <div className="custom-breadcrumb">
        <div className="breadcrumb-container">
          <div className="breadcrumb-links">
            <Link to="/"><i className="fa fa-home"></i> Home</Link>
            <span>My Orders</span>
          </div>
        </div>
      </div>


      {/* Orders Section */}
         <section className="contact spad" style={{borderBottom: '1px solid #000'}}>
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <h5 className="mb-4" style={{textAlign:'center', color: '#111111', fontWeight: '600', textTransform: 'uppercase', fontSize: '20px'}}>Your Orders</h5><br/>

              {orders.length === 0 ? (
                <p>You have not placed any orders yet.</p>
              ) : (
                <>
                  {!isMobile ? (
                    // Table view for desktop
                    <div className="full-width-table-wrapper">
    <div className="responsive-table-wrapper">
      <table className="table table-bordered align-middle orders-table">
    <thead>
      <tr style={{ textAlign: 'center' }}>
        <th>Order No</th>
        <th>Date</th>
        <th>Products</th>
        <th>Qty</th>
  <th>Item Total</th>
        <th>Payment</th>
        <th>Status</th>
        <th>Shipping Address</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {currentOrders.map((order) =>
        order.items.map((item, itemIndex) => (
          
          <tr key={`${order._id}-${itemIndex}`} style={{ verticalAlign: 'middle' }}>
            <td className="text-center fw-bold">
              ORD-{order._id.slice(-6).toUpperCase()}
            </td>
            <td className="text-center">
              {new Date(order.createdAt).toLocaleDateString()}
            </td>
            <td>
              <div className="d-flex align-items-center flex-md-row flex-column text-start order-product-info">
          {item.productId?.mainImage && (
  <img
    src={
      item.productId?.mainImage?.url
        ? item.productId.mainImage.url    // Cloudinary URL
        : `/uploads/${item.productId.mainImage}` // Local upload
    }
    alt="Product"
    width="60"
    height="60"
    className="rounded mb-2 mb-md-0"
    style={{ objectFit: 'cover' }}
  />
)}
                <div className="ms-md-3">
                  <div className="fw-bold">{item.productId?.title || item.title}</div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>
                    {item.variant?.size && <>Size: {item.variant?.size} </>}
                    {item.variant?.color && <>| Color: {item.variant?.color}</>}
                  </div>
                </div>
              </div>
            </td>
            <td className="text-center">{item.quantity}</td>

<td className="order-price-cell">
  <div className="order-price-main">
    {formatINR(item.finalPaidAmount)}
  </div>

  <details className="order-price-details">
    <summary>Price details</summary>

  {(() => {
  const price = getOrderPriceDetails(order);

  return (
    <div className="order-price-breakdown">
      <div>
        <span>Item subtotal</span>
        <span>{formatINR(price.subtotal)}</span>
      </div>

      <div>
        <span>Product discount</span>
        <span className="order-discount">
          −{formatINR(price.productDiscount)}
        </span>
      </div>

      {price.promoDiscount > 0 && (
        <div>
          <span>Coupon discount</span>
          <span className="order-discount">
            −{formatINR(price.promoDiscount)}
          </span>
        </div>
      )}

      <div>
        <span>Delivery charges</span>
        <span>
          {price.deliveryCharge > 0
            ? formatINR(price.deliveryCharge)
            : "Free"}
        </span>
      </div>

      <div className="order-price-total">
        <span>Total paid</span>
        <strong>{formatINR(price.totalPaid)}</strong>
      </div>
    </div>
  );
})()}
  </details>
</td>



            <td className="text-center">{order.paymentMode}</td>
          

<td className="text-center">
  <span
    className={`status-badge ${
      getItemStatus(item, order)
        .toLowerCase()
        .replace(/\s+/g, "-")
    }`}
  >
    {getItemStatus(item, order)}
  </span>
</td>


            <td style={{ fontSize: '13px' }}>
              <div>{order.billing.firstName} {order.billing.lastName}</div>
              <div>{order.billing.phone}</div>
              <div>{order.billing.addressLine1}</div>
              {order.billing.addressLine2 && <div>{order.billing.addressLine2}</div>}
              <div>{order.billing.city}, {order.billing.state}</div>
              <div>{order.billing.zip}</div>
            </td>
            <td className="text-center">
{item.status === 'Delivered' ? (
  <>
    <Link to={`/rate/${item.productId?._id}`} className="rate-btn-table">Rate</Link>
{item.status === 'Delivered' &&
  isWithinReturnPeriod(getDeliveredDate(order, item), 5) && // 5 days return period
  !item.isReturned && (
<button
  className="return-btn-table"
  onClick={() => openModal(order._id, item.variantId, 'return', order.paymentMode)}   // ← variantId
>
  Return
</button>
)}





  </>
) : (
  <>
    <button className="rate-btn-table disabled" onClick={() => toast.info("Please wait until delivery to rate.")}>
      Rate
    </button>
{item.status !== 'Cancelled' ? (
  isSameDay(order.createdAt) && (
    <button
      className="cancel-btn-table"
      onClick={() =>
        openModal(order._id, item.variantId, 'cancel', order.paymentMode)
      }
    >
      Cancel
    </button>
  )
) : (
  <span style={{ color: '#999', fontSize: '12px' }}>
    Cancelled
  </span>
)}
  </>
)}


{(order.status === 'Delivered' || isSameDay(order.createdAt)) && (
  <p style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
    Note: Delivery charge is refunded only for damaged or wrong items.
  </p>
)}
{order.isPaid === true && (
  <button
    type="button"
    className="receipt-download-btn"
    onClick={() => handleDownloadReceipt(order)}
  >
    Download Receipt (PDF)
  </button>
)}


            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>
</div>

                  ) : (
                    // Card view for mobile
                    <>
                      {currentOrders.map((order) =>
                        order.items.map((item, itemIndex) => (
                          <div key={`${order._id}-${itemIndex}`} className="order-card">
                            <div className="order-card-header">
                              Order: ORD-{order._id.slice(-6).toUpperCase()}
                            </div>
                            <div>Date: {new Date(order.createdAt).toLocaleDateString()}</div>
                            <div className="order-card-product">
                             <img
  src={
    item.productId?.mainImage?.url
      ? item.productId.mainImage.url   // Cloudinary URL
      : `/uploads/${item.productId?.mainImage}` // Local upload
  }
  alt="Product"
/>

                              <div className="order-card-product-details">
                                <div><b>{item.productId?.title || item.title}</b></div>
                                
                                <div className="text-muted" style={{ fontSize: '12px' }}>
                                {item.variant?.size && (
  <div style={{ fontSize: '12px' }}>
    Size: {item.variant.size}
  </div>
)}

{item.variant?.color && (
  <div style={{ fontSize: '12px' }}>
    Color: {item.variant.color}
  </div>
)}
                                </div>
                                <div>Qty: {item.quantity}</div>
                              </div>
                            </div>
                            <div className="order-card-footer">
                              
<div className="order-mobile-price">
  <span>Item total</span>
  <strong>{formatINR(item.finalPaidAmount)}</strong>
</div>

<details className="order-price-details">
  <summary>View price details</summary>

{(() => {
  const price = getOrderPriceDetails(order);

  return (
    <div className="order-price-breakdown">
      <div>
        <span>Item subtotal</span>
        <span>{formatINR(price.subtotal)}</span>
      </div>

      <div>
        <span>Product discount</span>
        <span className="order-discount">
          −{formatINR(price.productDiscount)}
        </span>
      </div>

      {price.promoDiscount > 0 && (
        <div>
          <span>Coupon discount</span>
          <span className="order-discount">
            −{formatINR(price.promoDiscount)}
          </span>
        </div>
      )}

      <div>
        <span>Delivery charges</span>
        <span>
          {price.deliveryCharge > 0
            ? formatINR(price.deliveryCharge)
            : "Free"}
        </span>
      </div>

      <div className="order-price-total">
        <span>Total paid</span>
        <strong>{formatINR(price.totalPaid)}</strong>
      </div>
    </div>
  );
})()}
</details>

                              <div>Payment Mode: {order.paymentMode}</div>
  

<div className="order-card-status">
  <span
    className={`status-badge ${
      getItemStatus(item, order)
        .toLowerCase()
        .replace(/\s+/g, "-")
    }`}
  >
    {getItemStatus(item, order)}
  </span>
</div>



                              <div><b>Ship To:</b> {order.billing.firstName} {order.billing.lastName}, {order.billing.addressLine1}, {order.billing.city}</div>
{item.status === 'Delivered' ? (
  <>
    <Link to={`/rate/${item.productId?._id}`} className="rate-btn-mobile">Rate</Link>
{item.status === 'Delivered' && (
  <>
    {item.returnStatus === 'ReturnRequested' && (
      <span style={{ color: '#f39c12', fontSize: '12px' }}>
        Return Requested
      </span>
    )}

    {item.returnStatus === 'ReturnApproved' && (
      <span style={{ color: '#3498db', fontSize: '12px' }}>
        Return Approved
      </span>
    )}

    {item.returnStatus === 'Returned' && (
      <span style={{ color: '#28a745', fontSize: '12px' }}>
        Returned
      </span>
    )}

    {!item.returnStatus &&
      isWithinReturnPeriod(getDeliveredDate(order, item), 5) && (
        <button
          className="return-btn-table"
          onClick={() =>
            openModal(order._id, item.variantId, 'return', order.paymentMode)
          }
        >
          Return
        </button>
      )}
  </>
)}




  </>
) : (
  <>
    <button
      className="rate-btn-mobile disabled"
      onClick={() => toast.info("Please wait until delivery to rate.")}
    >
      Rate
    </button>
    {isSameDay(order.createdAt) && !order.isCancelled && (
 <button
  className="cancel-btn-mobile"
  onClick={() => openModal(order._id, item.variantId, 'cancel', order.paymentMode)}   // ← variantId
>
  Cancel
</button>
    )}
  </>
)}


{(order.status === 'Delivered' || isSameDay(order.createdAt)) && (
  <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
    *Delivery charges refunded only for damaged/wrong products.
  </p>
)}
{order.isPaid === true && (
  <button
    type="button"
    className="receipt-download-btn"
    onClick={() => handleDownloadReceipt(order)}
  >
    Download Receipt (PDF)
  </button>
)}



                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Pagination */}
              
{/* Modern Pagination */}
{totalPages > 1 && (
  <div className="orders-pagination">
    <button
      className="pagination-arrow"
      disabled={currentPage === 1}
      onClick={() => setCurrentPage((prev) => prev - 1)}
      aria-label="Previous page"
    >
      ‹
    </button>

    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
      <button
        key={page}
        className={`pagination-number ${
          currentPage === page ? "active" : ""
        }`}
        onClick={() => setCurrentPage(page)}
        aria-current={currentPage === page ? "page" : undefined}
      >
        {page}
      </button>
    ))}

    <button
      className="pagination-arrow"
      disabled={currentPage === totalPages}
      onClick={() => setCurrentPage((prev) => prev + 1)}
      aria-label="Next page"
    >
      ›
    </button>
  </div>
)}

                </>
              )}
            </div>
          </div>
        </div>
<div className="order-notes">
    <h6 className="order-notes-title">
      <FaInfoCircle className="order-notes-icon" />
      Important Notes
    </h6>
    <ul className="order-notes-list">
      <li><span>*</span> Shipping Time: 0 to 7 days</li>
      <li><span>*</span> Refund Time: 3 to 5 days</li>
      <li><span>*</span> Cancellation: Only allowed on the same day of order</li>
      <li><span>*</span> Delivery charges are refunded only for damaged or wrong products</li>
    </ul>
  </div>



      </section>
<ReturnCancelModal
  isOpen={modalOpen}
  type={modalType}
  paymentMode={activeOrder.paymentMode}    
  onClose={() => setModalOpen(false)}
  onSubmit={handleModalSubmit}
/>

    </div>
    </>
  );
};

export default Orders;

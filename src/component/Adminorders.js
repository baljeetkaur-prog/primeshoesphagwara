import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Adminorders.css';
import Adminsidebar from './Adminsidebar';
import Admintopnav from './Admintopnav';
import { jwtDecode } from 'jwt-decode';
import { decryptToken } from '../utils/securetoken';

const Adminorders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin User");
  const [currentPage, setCurrentPage] = useState(1);
const [filterDate, setFilterDate] = useState('');
const [filterEndDate, setFilterEndDate] = useState('');
const [searchTerm, setSearchTerm] = useState('');
const [filterStatus, setFilterStatus] = useState('');
const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
const [filterPaymentMode, setFilterPaymentMode] = useState('');
const [filterShippingStatus, setFilterShippingStatus] = useState('');
const [minAmount, setMinAmount] = useState('');
const [maxAmount, setMaxAmount] = useState('');
  const [expandedOrders, setExpandedOrders] = useState({});
  const API = process.env.REACT_APP_APIURL;
  const ordersPerPage = 20;

  // Fetch Orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${API}/api/admin/orders`);
        setOrders(res.data.orders || []);
      } catch (err) {
        toast.error('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [API]);

  // Decode Admin Name
  useEffect(() => {
    const getAdminName = async () => {
      const encrypted = sessionStorage.getItem('adminToken');
      if (!encrypted) return;
      const decrypted = await decryptToken(encrypted);
      if (!decrypted) return;
      try {
        const decoded = jwtDecode(decrypted);
        setAdminName(decoded.adminname || "Admin User");
      } catch (err) {
        console.error("Invalid token");
      }
    };
    getAdminName();
  }, []);

  // Filtering + Pagination

  // Filtering + Pagination

  const getDateKey = (dateValue) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredOrders = orders.filter((order) => {
    const orderDate = getDateKey(order.createdAt);

    const customerName = [
      order.billing?.firstName,
      order.billing?.lastName,
      order.billing?.name,
      order.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const searchableValues = [
      order.orderNumber,
      order.email,
      order.billing?.email,
      order.billing?.phone,
      customerName,
      order._id,
    ];

    const matchesSearch =
      !normalizedSearch ||
      searchableValues.some((value) =>
        String(value || '').toLowerCase().includes(normalizedSearch)
      );

    const matchesStartDate =
      !filterDate || orderDate >= filterDate;

    const matchesEndDate =
      !filterEndDate || orderDate <= filterEndDate;

    const orderStatus = String(order.status || 'Pending').toLowerCase();
    const matchesStatus =
      !filterStatus ||
      orderStatus === filterStatus.toLowerCase();

    const matchesPaymentStatus =
      !filterPaymentStatus ||
      (filterPaymentStatus === 'paid'
        ? order.isPaid === true
        : order.isPaid !== true);

    const paymentMode = String(order.paymentMode || '').toLowerCase();

    const matchesPaymentMode =
      !filterPaymentMode ||
      paymentMode === filterPaymentMode.toLowerCase();

    const shippingStatus = String(
      order.shippingStatus || 'Pending'
    ).toLowerCase();

    const matchesShippingStatus =
      !filterShippingStatus ||
      shippingStatus === filterShippingStatus.toLowerCase();

    const orderAmount =
      Number(order.finalTotal || 0) +
      Number(order.deliveryCharge || 0);

    const matchesMinAmount =
      minAmount === '' || orderAmount >= Number(minAmount);

    const matchesMaxAmount =
      maxAmount === '' || orderAmount <= Number(maxAmount);

    return (
      matchesSearch &&
      matchesStartDate &&
      matchesEndDate &&
      matchesStatus &&
      matchesPaymentStatus &&
      matchesPaymentMode &&
      matchesShippingStatus &&
      matchesMinAmount &&
      matchesMaxAmount
    );
  });

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;

  const currentOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );

  const resetFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterEndDate('');
    setFilterStatus('');
    setFilterPaymentStatus('');
    setFilterPaymentMode('');
    setFilterShippingStatus('');
    setMinAmount('');
    setMaxAmount('');
    setCurrentPage(1);
  };


  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    toast.success("Logged out");
    window.location.href = "/adminlogin";
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <Adminsidebar adminName={adminName} handleLogout={handleLogout} />
        <div className="admin-main">
          <Admintopnav adminName={adminName} handleLogout={handleLogout} />
          <div className="orders-container text-center p-5">
            <p>Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <Adminsidebar adminName={adminName} handleLogout={handleLogout} />
      <div className="admin-main">
        <Admintopnav adminName={adminName} handleLogout={handleLogout} />

        <div className="orders-container">
          <div className="text-center mb-4">
            <h5 className="admin-users-title">ALL ORDERS</h5>
          </div>

          {/* Date Filter */}
       
  {/* Order Filters */}
  <div className="orders-filter-panel">
    <div className="orders-filter-heading">
      <h6>Filter Orders</h6>
      <button
        type="button"
        className="orders-clear-filters"
        onClick={resetFilters}
      >
        Clear All Filters
      </button>
    </div>

    <div className="orders-filter-grid">
      {/* Search */}
      <div className="orders-filter-field orders-search-field">
        <label htmlFor="orderSearch">Search Orders</label>
        <input
          type="text"
          id="orderSearch"
          placeholder="Order no., email, phone, customer..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Start Date */}
      <div className="orders-filter-field">
        <label htmlFor="filterDate">From Date</label>
        <input
          type="date"
          id="filterDate"
          value={filterDate}
          max={filterEndDate || undefined}
          onChange={(e) => {
            setFilterDate(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* End Date */}
      <div className="orders-filter-field">
        <label htmlFor="filterEndDate">To Date</label>
        <input
          type="date"
          id="filterEndDate"
          value={filterEndDate}
          min={filterDate || undefined}
          onChange={(e) => {
            setFilterEndDate(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Order Status */}
      <div className="orders-filter-field">
        <label htmlFor="filterStatus">Order Status</label>
        <select
          id="filterStatus"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Order Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Processing">Processing</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Returned">Returned</option>
        </select>
      </div>

      {/* Payment Status */}
      <div className="orders-filter-field">
        <label htmlFor="filterPaymentStatus">Payment Status</label>
        <select
          id="filterPaymentStatus"
          value={filterPaymentStatus}
          onChange={(e) => {
            setFilterPaymentStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Payment Statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      {/* Payment Method */}
      <div className="orders-filter-field">
        <label htmlFor="filterPaymentMode">Payment Method</label>
        <select
          id="filterPaymentMode"
          value={filterPaymentMode}
          onChange={(e) => {
            setFilterPaymentMode(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Payment Methods</option>

          {[...new Set(
            orders
              .map((order) => order.paymentMode)
              .filter(Boolean)
              .map((mode) => String(mode).toLowerCase())
          )].map((mode) => (
            <option key={mode} value={mode}>
              {mode.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Shipping Status */}
      <div className="orders-filter-field">
        <label htmlFor="filterShippingStatus">Shipping Status</label>
        <select
          id="filterShippingStatus"
          value={filterShippingStatus}
          onChange={(e) => {
            setFilterShippingStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Shipping Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Ready for Pickup">Ready for Pickup</option>
          <option value="Shipped">Shipped</option>
          <option value="In Transit">In Transit</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Returned">Returned</option>
        </select>
      </div>

      {/* Minimum Amount */}
      <div className="orders-filter-field">
        <label htmlFor="minAmount">Minimum Amount (₹)</label>
        <input
          type="number"
          id="minAmount"
          min="0"
          placeholder="Min amount"
          value={minAmount}
          onChange={(e) => {
            setMinAmount(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Maximum Amount */}
      <div className="orders-filter-field">
        <label htmlFor="maxAmount">Maximum Amount (₹)</label>
        <input
          type="number"
          id="maxAmount"
          min="0"
          placeholder="Max amount"
          value={maxAmount}
          onChange={(e) => {
            setMaxAmount(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>

    <p className="orders-filter-results">
      Showing {filteredOrders.length} of {orders.length} orders
    </p>
  </div>


          {/* ---------------- Table for Large Screens ---------------- */}
          {currentOrders.length > 0 && (
           <div className="orders-table-container">
              <table className="orders-table">
       
<thead>
  <tr>
    <th></th>
    <th>Order No</th>
    <th>Date</th>
    <th>Customer</th>
    <th>Amount</th>
    <th>Payment</th>
    <th>Order Status</th>
    <th>Shipping Status</th>
    <th>Delivery</th>
  </tr>
</thead>

                <tbody>
                  {currentOrders.map((order) => (
                    <React.Fragment key={order._id}>
                      <tr className="order-row">
                        <td>
                          <button
                            className="expand-btn"
                            onClick={() => toggleOrderExpansion(order._id)}
                          >
                            {expandedOrders[order._id] ? "▼" : "▶"}
                          </button>
                        </td>
                        <td>#{order.orderNumber}</td>
                        <td>{new Date(order.createdAt).toLocaleString()}</td>
                        <td>{order.email}<br /><small>{order.billing?.phone}</small></td>
                        <td>₹{order.finalTotal + (order.deliveryCharge || 0)}</td>
                        <td>
                          {order.paymentMode?.toUpperCase()} <br />
                          {order.isPaid ? <span className="paid">Paid</span> : <span className="unpaid">Unpaid</span>}
                        </td>
                        
<td>
  <span className={`order-status-badge ${(
    order.status || "Pending"
  ).toLowerCase().replace(/\s+/g, "-")}`}>
    {order.status || "Pending"}
  </span>
</td>

<td>
  <span className={`shipping-status-badge ${(
    order.shippingStatus || "Pending"
  ).toLowerCase().replace(/\s+/g, "-")}`}>
    {order.shippingStatus || "Pending"}
  </span>
</td>

                        <td>{order.deliveryCharge > 0 ? `₹${order.deliveryCharge}` : <span className="free-delivery">Free</span>}</td>
                      </tr>

                      {expandedOrders[order._id] && (
                        <tr className="order-items-row">
                       <td colSpan="9">
                            <div className="order-items">
                              {order.items.map((item, i) => (
                                <div key={i} className="order-item">
                                  {item.productId?.mainImage && (
                                    <img
                                      src={item.productId?.mainImage?.url || `/uploads/${item.productId.mainImage}`}
                                      alt={item.title}
                                      className="item-img"
                                    />
                                  )}
                                <div className="item-details">
  <p className="item-title">
    <a
href={
  item.productId?.slug
    ? `/product/${item.productId.slug}`
    : undefined
}
      target="_blank"
      rel="noopener noreferrer"
      className="admin-product-link"
    >
      {item.title}
    </a>
  </p>

  <p><strong>Quantity ordered:</strong> {item.quantity}</p>

  <p>
    <strong>Color:</strong>{" "}
    {item.variant?.color || item.color || "N/A"}
  </p>

  <p>
    <strong>Size:</strong>{" "}
    {item.variant?.size || item.size || "N/A"}
  </p>

  <p><strong>Price:</strong> ₹{item.discountPrice}</p>

  {item.coupon?.code && (
    <p className="text-success">
      Coupon: {item.coupon.code} ({item.coupon.amount}% off)
    </p>
  )}
</div>
                                  <div className="item-status">
                                    <select
                                      value={item.status}
                                      disabled={item.isCancelled || item.isReturned}
                           
onChange={async (e) => {
  const newStatus = e.target.value;

  try {
    const response = await axios.put(
      `${API}/api/orders/${order._id}/item/${i}/status`,
      { status: newStatus }
    );

    toast.success("Item and order status updated");

    const updatedOrder = response.data.order;

    setOrders((prev) =>
      prev.map((o) =>
        o._id === order._id
          ? {
              ...o,
              status: updatedOrder.status,
              shippingStatus: updatedOrder.shippingStatus,
              items: updatedOrder.items,
            }
          : o
      )
    );
  } catch (err) {
    toast.error(
      err.response?.data?.message || "Failed to update item status"
    );
  }
}}

                                    >
                               <option value="Pending">Pending</option>
<option value="Confirmed">Confirmed</option>
<option value="Shipped">Shipped</option>
<option value="Delivered">Delivered</option>
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------------- Cards for Small Screens ---------------- */}
          <div className="order-cards-container">
            {currentOrders.length === 0 ? (
              <p className="text-center">No orders found.</p>
            ) : (
              currentOrders.map(order => (
                <div className="order-card" key={order._id}>
                  <div className="order-card-header">
                    <span>Order #{order.orderNumber}</span>
                    <span>
                      <button
                        className="expand-btn"
                        onClick={() => toggleOrderExpansion(order._id)}
                      >
                        {expandedOrders[order._id] ? "▼" : "▶"}
                      </button>
                    </span>
                  </div>
                  <div className="order-card-body">
                    <div><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</div>
                    <div><strong>Customer:</strong> {order.email}, {order.billing?.phone}</div>
                    <div><strong>Amount:</strong> ₹{order.finalTotal + (order.deliveryCharge || 0)}</div>
                    <div><strong>Payment:</strong> {order.paymentMode?.toUpperCase()} - {order.isPaid ? <span className="paid">Paid</span> : <span className="unpaid">Unpaid</span>}</div>
                    
<div>
  <strong>Order Status:</strong>{" "}
  <span className={`order-status-badge ${(
    order.status || "Pending"
  ).toLowerCase().replace(/\s+/g, "-")}`}>
    {order.status || "Pending"}
  </span>
</div>

<div>
  <strong>Shipping:</strong>{" "}
  <span className={`shipping-status-badge ${(
    order.shippingStatus || "Pending"
  ).toLowerCase().replace(/\s+/g, "-")}`}>
    {order.shippingStatus || "Pending"}
  </span>
</div>

                    <div><strong>Delivery:</strong> {order.deliveryCharge > 0 ? `₹${order.deliveryCharge}` : <span className="free-delivery">Free</span>}</div>

                    {expandedOrders[order._id] && (
                      <div className="order-items mt-2">
                        {order.items.map((item, i) => (
                          <div className="order-card-item" key={i}>
                            {item.productId?.mainImage && (
                              <img src={item.productId?.mainImage?.url || `/uploads/${item.productId.mainImage}`} alt={item.title} />
                            )}
                          <div className="order-card-item-details">
  <p>
    <a
href={
  item.productId?.slug
    ? `/product/${item.productId.slug}`
    : undefined
}
      target="_blank"
      rel="noopener noreferrer"
      className="admin-product-link"
    >
      {item.title}
    </a>
  </p>

  <p><strong>Quantity ordered:</strong> {item.quantity}</p>

  <p>
    <strong>Color:</strong>{" "}
    {item.variant?.color || item.color || "N/A"}
  </p>

  <p>
    <strong>Size:</strong>{" "}
    {item.variant?.size || item.size || "N/A"}
  </p>

  <p><strong>Price:</strong> ₹{item.discountPrice}</p>

  {item.coupon?.code && (
    <p className="text-success">
      Coupon: {item.coupon.code} ({item.coupon.amount}% off)
    </p>
  )}
</div>
                            <div className="item-status">
                              <select
                                value={item.status}
                                disabled={item.isCancelled || item.isReturned}
                     
onChange={async (e) => {
  const newStatus = e.target.value;

  try {
    const response = await axios.put(
      `${API}/api/orders/${order._id}/item/${i}/status`,
      { status: newStatus }
    );

    toast.success("Item and order status updated");

    const updatedOrder = response.data.order;

    setOrders((prev) =>
      prev.map((o) =>
        o._id === order._id
          ? {
              ...o,
              status: updatedOrder.status,
              shippingStatus: updatedOrder.shippingStatus,
              items: updatedOrder.items,
            }
          : o
      )
    );
  } catch (err) {
    toast.error(
      err.response?.data?.message || "Failed to update item status"
    );
  }
}}

                              >
                         <option value="Pending">Pending</option>
<option value="Confirmed">Confirmed</option>
<option value="Shipped">Shipped</option>
<option value="Delivered">Delivered</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ---------------- Pagination ---------------- */}
          {filteredOrders.length > ordersPerPage && (
            <div className="pagination-container text-center mt-4 mb-4">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`pagination-button ${currentPage === i + 1 ? "active" : ""}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Adminorders;

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Adminsidebar from './Adminsidebar';
import Admintopnav from './Admintopnav';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { decryptToken } from '../utils/securetoken';
import './Adminsales.css';

const Adminsales = () => {
  const [sales, setSales] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [filterDate, setFilterDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [filterShippingStatus, setFilterShippingStatus] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const [adminName, setAdminName] = useState('Admin User');
  const [loading, setLoading] = useState(true);

  const salesPerPage = 20;
  const API = process.env.REACT_APP_APIURL;

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await axios.get(`${API}/api/admin/orders`);
        setSales(res.data.orders || []);
      } catch (error) {
        console.error('Failed to fetch sales:', error);
        toast.error('Failed to fetch sales data');
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [API]);

  useEffect(() => {
    const fetchAdminName = async () => {
      try {
        const encryptedToken = sessionStorage.getItem('adminToken');
        if (!encryptedToken) return;

        const decrypted = await decryptToken(encryptedToken);
        if (!decrypted) return;

        const decodedToken = jwtDecode(decrypted);
        setAdminName(decodedToken.adminname || 'Admin User');
      } catch {
        setAdminName('Admin User');
      }
    };

    fetchAdminName();
  }, []);

  const getDateKey = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const normalizedTitle = filterTitle.trim().toLowerCase();

  const filteredSales = useMemo(() => {
    return sales.filter((order) => {
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

      const matchesProduct =
        !normalizedTitle ||
        (order.items || []).some((item) =>
          String(item.title || '').toLowerCase().includes(normalizedTitle)
        );

      const matchesStatus =
        !filterStatus ||
        String(order.status || 'Pending').toLowerCase() ===
          filterStatus.toLowerCase();

      const matchesPaymentStatus =
        !filterPaymentStatus ||
        (filterPaymentStatus === 'paid'
          ? order.isPaid === true
          : order.isPaid !== true);

      const matchesPaymentMode =
        !filterPaymentMode ||
        String(order.paymentMode || '').toLowerCase() ===
          filterPaymentMode.toLowerCase();

      const matchesShippingStatus =
        !filterShippingStatus ||
        String(order.shippingStatus || 'Pending').toLowerCase() ===
          filterShippingStatus.toLowerCase();

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
        matchesProduct &&
        matchesStatus &&
        matchesPaymentStatus &&
        matchesPaymentMode &&
        matchesShippingStatus &&
        matchesMinAmount &&
        matchesMaxAmount
      );
    });
  }, [
    sales,
    normalizedSearch,
    normalizedTitle,
    filterDate,
    filterEndDate,
    filterStatus,
    filterPaymentStatus,
    filterPaymentMode,
    filterShippingStatus,
    minAmount,
    maxAmount,
  ]);

  const totalPages = Math.ceil(filteredSales.length / salesPerPage);

  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;

  const currentSales = filteredSales.slice(
    indexOfFirstSale,
    indexOfLastSale
  );

  const resetFilters = () => {
    setFilterDate('');
    setFilterEndDate('');
    setFilterTitle('');
    setSearchTerm('');
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
    toast.success('Logged out');
    window.location.href = '/adminlogin';
  };

  const paymentModes = [
    ...new Set(
      sales
        .map((order) => String(order.paymentMode || '').toLowerCase())
        .filter(Boolean)
    ),
  ];

  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="admin-layout">
      <Adminsidebar
        adminName={adminName}
        handleLogout={handleLogout}
      />

      <div className="admin-main">
        <Admintopnav
          adminName={adminName}
          handleLogout={handleLogout}
        />

        <div className="sales-container">
          <div className="text-center mb-4">
            <h5 className="admin-users-title">SALES SUMMARY</h5>
          </div>

          {/* Sales filters */}
          <div className="sales-filter-panel">
            <div className="sales-filter-heading">
              <h6>Filter Sales</h6>

              <button
                type="button"
                className="sales-clear-filters"
                onClick={resetFilters}
                disabled={
                  !filterDate &&
                  !filterEndDate &&
                  !filterTitle &&
                  !searchTerm &&
                  !filterStatus &&
                  !filterPaymentStatus &&
                  !filterPaymentMode &&
                  !filterShippingStatus &&
                  minAmount === '' &&
                  maxAmount === ''
                }
              >
                Clear All Filters
              </button>
            </div>

            <div className="sales-filter-grid">
              <div className="sales-filter-field sales-search-field">
                <label htmlFor="salesSearch">Search Orders</label>
                <input
                  id="salesSearch"
                  type="text"
                  placeholder="Order no., email, phone, customer..."
                  value={searchTerm}
                  onChange={handleFilterChange(setSearchTerm)}
                />
              </div>

              <div className="sales-filter-field">
                <label htmlFor="salesFromDate">From Date</label>
                <input
                  id="salesFromDate"
                  type="date"
                  value={filterDate}
                  max={filterEndDate || undefined}
                  onChange={handleFilterChange(setFilterDate)}
                />
              </div>

              <div className="sales-filter-field">
                <label htmlFor="salesToDate">To Date</label>
                <input
                  id="salesToDate"
                  type="date"
                  value={filterEndDate}
                  min={filterDate || undefined}
                  onChange={handleFilterChange(setFilterEndDate)}
                />
              </div>

              <div className="sales-filter-field">
                <label htmlFor="salesProduct">Product</label>
                <input
                  id="salesProduct"
                  type="text"
                  placeholder="Search product title"
                  value={filterTitle}
                  onChange={handleFilterChange(setFilterTitle)}
                />
              </div>

              <div className="sales-filter-field">
                <label htmlFor="salesOrderStatus">Order Status</label>
                <select
                  id="salesOrderStatus"
                  value={filterStatus}
                  onChange={handleFilterChange(setFilterStatus)}
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

              <div className="sales-filter-field">
                <label htmlFor="salesPaymentStatus">Payment Status</label>
                <select
                  id="salesPaymentStatus"
                  value={filterPaymentStatus}
                  onChange={handleFilterChange(setFilterPaymentStatus)}
                >
                  <option value="">All Payment Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div className="sales-filter-field">
                <label htmlFor="salesPaymentMode">Payment Method</label>
                <select
                  id="salesPaymentMode"
                  value={filterPaymentMode}
                  onChange={handleFilterChange(setFilterPaymentMode)}
                >
                  <option value="">All Payment Methods</option>
                  {paymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sales-filter-field">
                <label htmlFor="salesShippingStatus">Shipping Status</label>
                <select
                  id="salesShippingStatus"
                  value={filterShippingStatus}
                  onChange={handleFilterChange(setFilterShippingStatus)}
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

              <div className="sales-filter-field">
                <label htmlFor="salesMinAmount">Minimum Amount (₹)</label>
                <input
                  id="salesMinAmount"
                  type="number"
                  min="0"
                  placeholder="Min amount"
                  value={minAmount}
                  onChange={handleFilterChange(setMinAmount)}
                />
              </div>

              <div className="sales-filter-field">
                <label htmlFor="salesMaxAmount">Maximum Amount (₹)</label>
                <input
                  id="salesMaxAmount"
                  type="number"
                  min="0"
                  placeholder="Max amount"
                  value={maxAmount}
                  onChange={handleFilterChange(setMaxAmount)}
                />
              </div>
            </div>

            <p className="sales-filter-results">
              Showing {filteredSales.length} of {sales.length} orders
            </p>
          </div>

          {/* Sales table */}
          <div className="sales-table-container">
            {loading ? (
              <p className="text-center">Loading sales...</p>
            ) : currentSales.length === 0 ? (
              <p className="text-center">No sales to display.</p>
            ) : (
              <table className="sales-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order No.</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price (₹)</th>
                    <th>Promo (₹)</th>
                    <th>Delivery (₹)</th>
                    <th>Final (₹)</th>
                    <th>Payment</th>
                    <th>Order Status</th>
                    <th>Shipping Status</th>
                  </tr>
                </thead>

                <tbody>
                  {currentSales.flatMap((order) =>
                    (order.items || [])
                      .filter((item) =>
                        normalizedTitle
                          ? String(item.title || '')
                              .toLowerCase()
                              .includes(normalizedTitle)
                          : true
                      )
                      .map((item, i) => (
                        <tr key={`${order._id}-${item._id || i}`}>
                          <td>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td>#{order.orderNumber || order._id}</td>
                          <td>
                            {[
                              order.billing?.firstName,
                              order.billing?.lastName,
                            ]
                              .filter(Boolean)
                              .join(' ') || order.name || 'N/A'}
                            <br />
                            <small>{order.email || order.billing?.email}</small>
                          </td>
                          <td>{item.title}</td>
                          <td>{item.quantity}</td>
                          <td>{Number(item.discountPrice || 0).toFixed(2)}</td>
                          <td>{Number(order.promoDiscount || 0).toFixed(2)}</td>
                          <td>{Number(order.deliveryCharge || 0).toFixed(2)}</td>
                          <td>
                            {(
                              Number(order.finalTotal || 0) +
                              Number(order.deliveryCharge || 0)
                            ).toFixed(2)}
                          </td>
                          <td>
                            {String(order.paymentMode || 'N/A').toUpperCase()}
                            <br />
                            {order.isPaid ? 'Paid' : 'Unpaid'}
                          </td>
                          <td>{order.status || 'Pending'}</td>
                          <td>{order.shippingStatus || 'Pending'}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredSales.length > salesPerPage && (
            <div className="pagination-container mt-4 mb-4">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`pagination-button ${
                    currentPage === i + 1 ? 'active' : ''
                  }`}
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

export default Adminsales;
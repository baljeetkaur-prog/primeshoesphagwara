import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Adminsidebar from './Adminsidebar';
import Admintopnav from './Admintopnav';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { decryptToken } from '../utils/securetoken';
import './Adminreturns.css';

const API = process.env.REACT_APP_APIURL;
const ordersPerPage = 10;

const getAdminAuthHeaders = async () => {
  const encoded = sessionStorage.getItem('adminToken');

  if (!encoded) {
    window.location.href = '/adminlogin';
    throw new Error('Admin session not found');
  }

  const token = await decryptToken(encoded);

  return {
    Authorization: `Bearer ${token}`,
  };
};

const Adminreturns = () => {
  const [orders, setOrders] = useState([]);
  const [adminName, setAdminName] = useState('Admin User');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Fetch orders with returns (Pending + Refunded)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
      const headers = await getAdminAuthHeaders();

const res = await axios.get(
  `${API}/api/admin/orders`,
  { headers }
);

const filtered = res.data.orders.filter((o) =>
  o.items.some(
    (item) =>
      item.status === "Return Requested" ||
      item.isReturned ||
      item.isCancelled
  )
);

        setOrders(filtered);
      } catch (err) {
        toast.error('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Decode admin name
  useEffect(() => {
    const encoded = sessionStorage.getItem('adminToken');

    if (encoded) {
      decryptToken(encoded)
        .then((token) => {
          const decoded = jwtDecode(token);
          setAdminName(decoded.adminname || 'Admin User');
        })
        .catch(() => {
          toast.error('Session expired. Please login again.');
          window.location.href = '/adminlogin';
        });
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    toast.success('Logged out');
    window.location.href = '/adminlogin';
  };

// Approve Refund Handler
const handleApproveRefund = async (orderId, variantId, itemTitle) => {
  if (!variantId) {
    toast.error("Error: Variant ID is missing. Cannot process refund.");
    console.error("Missing variantId for order:", orderId);
    return;
  }

  if (!window.confirm(`Approve refund for ${itemTitle}?`)) return;

  try {
    console.log(`Approving refund - Order: ${orderId}, Variant: ${variantId}`); // Debug

const headers = await getAdminAuthHeaders();

const res = await axios.post(
  `${API}/api/admin/refund/${orderId}`,
  {
    variantId,
    amount: null,
  },
  { headers }
);

toast.success(`Refund request processed for ${itemTitle}`);

    // Refresh list
   const freshRes = await axios.get(
  `${API}/api/admin/orders`,
  { headers }
);
const updatedOrders = freshRes.data.orders.filter((o) =>
  o.items.some(
    (item) =>
      item.status === "Return Requested" ||
      item.isReturned ||
      item.isCancelled
  )
);
    setOrders(updatedOrders);

  } catch (err) {
    console.error("Refund Error Details:", err.response?.data || err.message);
    toast.error(
      err.response?.data?.message || "Refund failed. Check console for details."
    );
  }
};

const handleInspectReturn = async (orderId, variantId, itemTitle) => {
  if (!variantId) {
    toast.error("Variant ID is missing.");
    return;
  }

  const confirmed = window.confirm(
    `Have the returned shoes for "${itemTitle}" arrived and been inspected, and are they suitable for resale?`
  );

  if (!confirmed) return;

  try {
    const headers = await getAdminAuthHeaders();

    const res = await axios.post(
      `${API}/api/admin/returns/${orderId}/inspect`,
      {
        variantId,
        approvedForResale: true,
      },
      { headers }
    );

    toast.success(res.data.message || "Return inspection recorded.");

    const freshRes = await axios.get(`${API}/api/admin/orders`, {
      headers,
    });

    const updatedOrders = freshRes.data.orders.filter((o) =>
      o.items.some(
        (item) =>
          item.status === "Return Requested" ||
          item.isReturned ||
          item.isCancelled
      )
    );

    setOrders(updatedOrders);
  } catch (err) {
    console.error(
      "Inspection error:",
      err.response?.data || err.message
    );

    toast.error(
      err.response?.data?.message || "Could not record return inspection."
    );
  }
};

const handleArrangeReturnPickup = async (
  orderId,
  variantId,
  itemTitle
) => {
  if (!variantId) {
    toast.error("Variant ID is missing.");
    return;
  }

  const confirmed = window.confirm(
    `Arrange a REAL Shiprocket return pickup for "${itemTitle}"?`
  );

  if (!confirmed) return;

  try {
    const headers = await getAdminAuthHeaders();

    const res = await axios.post(
      `${API}/api/admin/return-pickup/${orderId}`,
      { variantId },
      { headers }
    );

    toast.success(
      res.data.message || "Return pickup request submitted."
    );

    const freshRes = await axios.get(
      `${API}/api/admin/orders`,
      { headers }
    );

    const filtered = freshRes.data.orders.filter((o) =>
      o.items.some(
        (item) =>
          item.status === "Return Requested" ||
          item.isReturned ||
          item.isCancelled
      )
    );

    setOrders(filtered);
  } catch (err) {
    console.error(
      "Return pickup error:",
      err.response?.data || err.message
    );

    toast.error(
      err.response?.data?.message ||
        "Could not confirm return pickup. Check Shiprocket before retrying."
    );
  }
};

const handleMarkReturnDelivered = async (
  orderId,
  variantId,
  itemTitle
) => {
  const confirmed = window.confirm(
    `Confirm that "${itemTitle}" has physically arrived at Prime Shoes?`
  );

  if (!confirmed) return;

  try {
    const headers = await getAdminAuthHeaders();

    const res = await axios.post(
      `${API}/api/admin/returns/${orderId}/mark-delivered`,
      { variantId },
      { headers }
    );

    toast.success(res.data.message);

    const freshRes = await axios.get(
      `${API}/api/admin/orders`,
      { headers }
    );

    const filtered = freshRes.data.orders.filter((o) =>
      o.items.some(
        (item) =>
          item.status === "Return Requested" ||
          item.isReturned ||
          item.isCancelled
      )
    );

    setOrders(filtered);
  } catch (err) {
    console.error(
      "Mark return delivered error:",
      err.response?.data || err.message
    );

    toast.error(
      err.response?.data?.message ||
        "Could not mark the return as delivered."
    );
  }
};




  // Pagination
  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const indexOfLast = currentPage * ordersPerPage;
  const indexOfFirst = indexOfLast - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirst, indexOfLast);

  if (loading) {
    return <div className="admin-layout">Loading...</div>;
  }

  return (
    <div className="admin-layout">
      <Adminsidebar adminName={adminName} handleLogout={handleLogout} />

      <div className="admin-main">
        <Admintopnav adminName={adminName} handleLogout={handleLogout} />

        <div className="returns-container p-4">
          <h5 className="admin-users-title mb-4">
            RETURN REQUESTS MANAGEMENT
          </h5>

          {currentOrders.length === 0 ? (
            <p className="text-center">No return requests found.</p>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="returns-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order No</th>
<th>Type</th>
<th>Product</th>
                    <th>Qty</th>
                    <th>Reason</th>
                    <th>Refund Status</th>
                    <th>Action</th>
                    <th>Billing Info</th>
                  </tr>
                </thead>

                <tbody>
                  {currentOrders.flatMap((order) =>
                 order.items
.filter(
  (item) =>
    item.status === "Return Requested" ||
    item.isReturned ||
    item.isCancelled
)
  .map((item, idx) => (
                        <tr
                          key={`${order._id}-${idx}`}
                          className="return-row"
                        >
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                         <td>{order.orderNumber}</td>

<td>
{item.status === "Return Requested" || item.isReturned ? (
    <span
      style={{
        background: "#ffc107",
        color: "#000",
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
      }}
    >
      Return
    </span>
  ) : (
    <span
      style={{
        background: "#dc3545",
        color: "#fff",
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
      }}
    >
      Cancelled
    </span>
  )}
</td>

<td>{item.title}</td>
                          <td>{item.quantity}</td>
                          <td>
{item.status === "Return Requested" || item.isReturned
  ? item.returnReason || "-"
  : item.cancellationReason || "-"}
</td>

                         <td>
  <span
    style={{
      padding: "5px 10px",
      borderRadius: "12px",
      fontSize: "13px",
      background:
        item.refundStatus === "Refunded"
          ? "#28a745"
          : item.refundStatus === "Pending"
          ? "#ffc107"
          : "#6c757d",
      color:
        item.refundStatus === "Refunded"
          ? "#fff"
          : "#000",
    }}
  >
    {item.refundStatus || "-"}
  </span>
</td>




<td>

{/* 1. Arrange return pickup */}
{item.status === "Return Requested" &&
  item.refundStatus === "Pending" &&
  !item.isReturned &&
  (order.returnPickupStatus === "Not Requested" ||
    !order.returnPickupStatus) && (
    <button
      className="btn btn-primary btn-sm"
      onClick={() =>
        handleArrangeReturnPickup(
          order._id,
          item.variantId,
          item.title
        )
      }
    >
      Arrange Return Pickup
    </button>
  )}

{/* 2. Show current pickup status */}
{order.returnPickupStatus === "Pending" && (
  <div>Return pickup needs confirmation</div>
)}

{order.returnPickupStatus === "Booked" && (
  <div>
    Return pickup booked
    {order.returnAwbCode
      ? ` — AWB: ${order.returnAwbCode}`
      : ""}
  </div>
)}

{/* 3. Admin confirms physical receipt of the parcel */}
{item.status === "Return Requested" &&
  item.refundStatus === "Pending" &&
  !item.isReturned &&
  item.returnInspected !== true &&
  order.returnAwbCode &&
  ["Booked", "Picked Up", "In Transit"].includes(
    order.returnPickupStatus
  ) && (
    <button
      className="btn btn-info btn-sm mt-2"
      onClick={() =>
        handleMarkReturnDelivered(
          order._id,
          item.variantId,
          item.title
        )
      }
    >
      Mark Return Delivered
    </button>
  )}

{/* 4. Inspect only after admin confirms delivery */}
{item.status === "Return Requested" &&
  item.refundStatus === "Pending" &&
  !item.isReturned &&
  item.returnInspected !== true &&
  order.returnPickupStatus === "Delivered" && (
    <button
      className="btn btn-warning btn-sm mt-2"
      onClick={() =>
        handleInspectReturn(
          order._id,
          item.variantId,
          item.title
        )
      }
    >
      Inspect Return
    </button>
  )}

{/* 5. Approve refund after inspection */}
{item.status === "Return Requested" &&
  item.refundStatus === "Pending" &&
  item.returnInspected === true &&
  !item.isReturned && (
    <button
      className="btn btn-success btn-sm mt-2"
      onClick={() =>
        handleApproveRefund(
          order._id,
          item.variantId,
          item.title
        )
      }
    >
      Approve Refund
    </button>
  )}

{/* 6. Show final refund status */}
{item.refundStatus === "Refunded" &&
  item.stockRestored === true && (
    <span style={{ color: "green", fontWeight: "bold" }}>
      ✓ Refunded & Stock Restored
    </span>
  )}

{item.refundStatus === "Refunded" &&
  item.stockRestored !== true && (
    <span style={{ color: "#b45309" }}>
      Refund processed — stock restoration needs checking
    </span>
  )}

{item.refundStatus === "Processing" && (
  <span>Refund Processing</span>
)}

{item.refundStatus === "Failed" && (
  <span style={{ color: "red" }}>Refund Failed</span>
)}

</td>




                          <td style={{ fontSize: '13px' }}>
                            {order.billing?.firstName} {order.billing?.lastName}
                            <br />
                            {order.billing?.phone}

                            {item.bankDetails?.accountNumber && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  fontSize: '12px',
                                  color: '#0066cc',
                                }}
                              >
                                <strong>Bank Details:</strong><br />
                                {item.bankDetails.accountHolderName}<br />
                                A/c: {item.bankDetails.accountNumber}<br />
                                IFSC: {item.bankDetails.ifscCode}
                                {item.bankDetails.upiId && (
                                  <> <br />UPI: {item.bankDetails.upiId}</>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {orders.length > ordersPerPage && (
            <div className="pagination-container mt-4 text-center">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`pagination-button ${currentPage === i + 1 ? 'active' : ''}`}
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

export default Adminreturns;
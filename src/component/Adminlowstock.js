import React, { useEffect, useState } from 'react';
import { FaBoxOpen } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import Adminsidebar from './Adminsidebar';
import Admintopnav from './Admintopnav';
import './Adminorders.css';
import './Adminlowstock.css';
import { jwtDecode } from 'jwt-decode';
import { decryptToken } from '../utils/securetoken'; 

const API = process.env.REACT_APP_APIURL;

const iconStyle = { marginRight: '6px', color: '#EC6C1D;', fontSize: '13px' };

const Adminlowstock = () => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [updatedQuantities, setUpdatedQuantities] = useState({});
  const [adminName, setAdminName] = useState("Admin User");

  useEffect(() => {
    fetchLowStock();
  }, []);

  useEffect(() => {
    const encoded = sessionStorage.getItem('adminToken');
    if (encoded) {
      decryptToken(encoded)
        .then(token => {
          const decoded = jwtDecode(token);
          setAdminName(decoded.adminname || "Admin User");
        })
        .catch(() => {
          console.error("Invalid token");
          toast.error("Session expired. Please login again.");
          window.location.href = "/adminlogin";
        });
    }
  }, []);

  const fetchLowStock = async () => {
    try {
      const encoded = sessionStorage.getItem('adminToken');
      const token = await decryptToken(encoded);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API}/api/admin/products/all`, config);
    const lowStock = res.data.filter(prod =>
  prod.variants?.some(v => v.quantity <= 2)
);
      setLowStockProducts(lowStock);
    } catch (err) {
      toast.error("Failed to fetch low stock products");
    }
  };

  const handleStockChange = (productId, value) => {
    setUpdatedQuantities(prev => ({
      ...prev,
      [productId]: value
    }));
  };

const updateStock = async (productId, variantId) => {
const newQuantity =
  updatedQuantities[variantId];
    if (newQuantity === '' || isNaN(newQuantity) || Number(newQuantity) < 0) {
      return toast.error("Please enter a valid quantity.");
    }

    try {
      const encoded = sessionStorage.getItem('adminToken');
      const token = await decryptToken(encoded);
      const config = { headers: { Authorization: `Bearer ${token}` } };

await axios.put(
  `${API}/api/products/updatevariantstock/${productId}/${variantId}`,
  {
    quantity: Number(newQuantity)
  },
  config
);

      toast.success("Stock updated successfully!");
    setUpdatedQuantities(prev => ({
  ...prev,
  [variantId]: ''
}));
      fetchLowStock();
    } catch (err) {
      toast.error("Failed to update stock.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    toast.success("Logged out");
    window.location.href = "/adminlogin";
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <Adminsidebar adminName={adminName} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="admin-main" style={{ paddingTop: '80px' }}>
        {/* Top Navigation */}
        <Admintopnav adminName={adminName} handleLogout={handleLogout} />

        {/* Low Stock Products Section */}
        <section className="contact spad" style={{ paddingTop: '0px', marginTop: '0' }}>
          <div className="container">
            <div className="text-center mb-4">
              <h5 className="admin-users-title">LOW STOCK PRODUCTS</h5>
            </div>

            <div className="row">
              {lowStockProducts.length === 0 ? (
                <div className="col-12 text-center">
                  <p>No low stock products found.</p>
                </div>
              ) : (
                lowStockProducts.map((product, index) => {
                 const totalQty = product.variants?.reduce(
  (sum, variant) => sum + variant.quantity,
  0
);

const label = totalQty === 0 ? "Out of Stock" : "Low Stock";

                  return (
                    <div className="col-md-6 col-lg-4 mb-4" key={index}>
                      <div className="lowstock-product">
                        <img
                          src={product.mainImage?.url ? product.mainImage.url : `/uploads/${product.mainImage}`}
                          alt={product.title}
                        />
                        <h6 className="lowstock-prod-title">{product.title}</h6>
                        <p>
  Status:
  <span className={totalQty === 0 ? "label-out" : "label-low"}>
    {label}
  </span>
</p>
                     {product.variants?.map((variant) => (
  <div
    key={variant._id}
    style={{
      border: "1px solid #ddd",
      padding: "10px",
      marginBottom: "10px",
      borderRadius: "5px"
    }}
  >
    <p>
      <strong>
        {variant.color} / {variant.size}
      </strong>
    </p>

    <p>
      Current Stock: <strong>{variant.quantity}</strong>
    </p>

    <input
      type="number"
      placeholder="Enter quantity"
      className="stock-update-input"
      value={updatedQuantities[variant._id] || ""}
      onChange={(e) =>
        handleStockChange(
          variant._id,
          e.target.value
        )
      }
    />

    <button
      className="stock-update-btn"
      onClick={() =>
        updateStock(
          product._id,
          variant._id
        )
      }
    >
      Update Stock
    </button>
  </div>
))}
                        <p>Discounted Price: ₹{product.discountedPrice?.toFixed(1)}</p>

                       
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Adminlowstock;

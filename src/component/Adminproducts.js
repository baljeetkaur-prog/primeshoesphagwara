import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Adminsidebar from './Adminsidebar';
import Admintopnav from './Admintopnav';
import { jwtDecode } from 'jwt-decode';
import { decryptToken } from '../utils/securetoken';
import './Adminproducts.css';

const API = process.env.REACT_APP_APIURL;

const AdminProducts = () => {
  const [adminName, setAdminName] = useState("Admin User");
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortType, setSortType] = useState(""); // New: store selected filter
  const productsPerPage = 12;

  useEffect(() => {
    const loadAdmin = async () => {
      const tokenEncoded = sessionStorage.getItem('adminToken');
      if (!tokenEncoded) return toast.error("Admin not logged in");

      try {
        const token = await decryptToken(tokenEncoded);
        const decoded = jwtDecode(token);
        setAdminName(decoded.adminname || "Admin User");
        fetchProducts(token);
      } catch (err) {
        toast.error("Invalid session. Please login again.");
        window.location.href = "/adminlogin";
      }
    };
    loadAdmin();
  }, []);

  const fetchProducts = async (token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API}/api/admin/products/all`, config);
      setProducts(res.data || []);
    } catch (err) {
      toast.error("Failed to fetch products");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    toast.success("Logged out");
    window.location.href = "/adminlogin";
  };

  // ---------------- Filter Logic ----------------
  const filteredProducts = [...products].sort((a, b) => {
    switch (sortType) {
      case "price-low-high":
        return a.discountedPrice - b.discountedPrice;
      case "price-high-low":
        return b.discountedPrice - a.discountedPrice;
      case "alpha-a-z":
        return a.title.localeCompare(b.title);
      case "alpha-z-a":
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  // Pagination logic
  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-layout">
        <Adminsidebar adminName={adminName} handleLogout={handleLogout} />
        <div className="admin-main">
          <Admintopnav adminName={adminName} handleLogout={handleLogout} />

          <div className="product-list-section">
            <h5 className="section-title" style={{textAlign: 'center', color: '#111111', fontSize: '20px', fontWeight: '600', textTransform:'uppercase' }}>All Products</h5>

            {/* Filter Bar */}
           <div className="adminprod-filter-bar mb-3">
  <label>Sort By:</label>
  <select
    value={sortType}
    onChange={(e) => setSortType(e.target.value)}
    className="admin-input"
  >
    <option value="">Default</option>
    <option value="price-low-high">Price: Low → High</option>
    <option value="price-high-low">Price: High → Low</option>
    <option value="alpha-a-z">Alphabetical: A → Z</option>
    <option value="alpha-z-a">Alphabetical: Z → A</option>
  </select>
</div>


            <div className="row gx-3 gy-4">
              {currentProducts.length === 0 ? (
                <div className="col-12 text-center">
                  <p>No products found</p>
                </div>
              ) : (
                currentProducts.map((product) => (
                  <div key={product._id} className="col-lg-3 col-md-4 col-sm-6 col-6 mb-4">
                    <Link
                      to={`/adminproduct/${product._id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                     <div className="product__item adminprod-product-item">
  <div className="product__item__pic adminprod-product-pic" style={{ backgroundImage: `url(${product.mainImage?.url || `/uploads/${product.mainImage}`})` }}>
    {product.quantity <= 1 && <div className="label stockout">Out Of Stock</div>}
    {product.label && product.label !== 'Out Of Stock' && (
      <div className={`label ${product.label === 'Sale' ? 'sale' : 'new'}`}>
        {product.label}
      </div>
    )}
  </div>
  <div className="product__item__text adminprod-product-text">
    <h6>{product.title.length > 30 ? `${product.title.slice(0, 30)}...` : product.title}</h6>
    <div className="product-stock">Stock: <strong>{product.quantity}</strong></div>
    <div className="product-price">
      ₹{product.discountedPrice?.toFixed(1)}
      {product.originalPrice > product.discountedPrice && (
        <span>₹{product.originalPrice?.toFixed(1)}</span>
      )}
    </div>
  </div>
</div>

                    </Link>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination d-flex justify-content-center mt-4">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    className={`btn btn-sm mx-1 ${currentPage === i + 1 ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import Adminsidebar from './Adminsidebar';
import { decryptToken } from '../utils/securetoken';
import Admintopnav from './Admintopnav';
import './Adminproddetail.css';

const Adminproddetail = () => {
  const { id } = useParams();
  const API = process.env.REACT_APP_APIURL;
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [adminName, setAdminName] = useState('Admin User');
  const getImageUrl = (img) => (img?.url ? img.url : `/uploads/${img}`);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const encoded = sessionStorage.getItem('adminToken');
        const token = encoded ? await decryptToken(encoded) : null;

        const res = await axios.get(`${API}/api/adminproducts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProduct(res.data);
        setSelectedImage(getImageUrl(res.data.mainImage));
      } catch (err) {
        console.error('Failed to fetch product:', err);
        toast.error('Session expired. Please login again.');
        window.location.href = '/adminlogin';
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    const fetchAdmin = async () => {
      const encoded = sessionStorage.getItem('adminToken');
      if (encoded) {
        try {
          const token = await decryptToken(encoded);
          const decoded = jwtDecode(token);
          setAdminName(decoded.adminname || 'Admin User');
        } catch {
          toast.error('Session expired. Please login again.');
          window.location.href = '/adminlogin';
        }
      }
    };
    fetchAdmin();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    toast.success('Logged out');
    window.location.href = '/adminlogin';
  };

  if (!product) {
    return (
      <div className="admin-layout">
        <Adminsidebar adminName={adminName} handleLogout={handleLogout} />
        <div className="admin-main">
          <Admintopnav adminName={adminName} handleLogout={handleLogout} />
          <div className="text-center p-5">Loading product details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <Adminsidebar adminName={adminName} handleLogout={handleLogout} />
      <div className="admin-main">
        <Admintopnav adminName={adminName} handleLogout={handleLogout} />

        <div className="product-detail-container">
          <h2 className="product-detail-heading" style={{paddingBottom:'20px', fontSize:'20px', fontWeight:'500'}}>Product Details</h2>

          <div className="product-card">
            {/* Left: Images */}
            <div className="product-images">
              <div className="thumbnail-list">
                <img
                  src={getImageUrl(product.mainImage)}
                  alt="Main"
                  onClick={() => setSelectedImage(getImageUrl(product.mainImage))}
                  className={`thumbnail ${selectedImage === getImageUrl(product.mainImage) ? 'active' : ''}`}
                />
                {product.otherImages?.map((img, idx) => (
                  <img
                    key={idx}
                    src={getImageUrl(img)}
                    alt={`View ${idx + 1}`}
                    onClick={() => setSelectedImage(getImageUrl(img))}
                    className={`thumbnail ${selectedImage === getImageUrl(img) ? 'active' : ''}`}
                  />
                ))}
              </div>

              <div className="main-image">
                <img src={selectedImage} alt={product.title} className="full-image" />
              </div>
            </div>

            {/* Right: Info */}
            <div className="product-info" style={{padding: '5px 15px'}}>
              <h3 className="product-title" style={{fontSize:'16px', fontWeight:'400'}}>{product.title}{product.brand && ` — ${product.brand}`}</h3>

              <div className="product-pricing">
                ₹{product.discountedPrice?.toFixed(1)}
                {product.originalPrice > product.discountedPrice && (
                  <span className="original-price">₹{product.originalPrice?.toFixed(1)}</span>
                )}
              </div>

              <p className="product-description">{product.description || 'No description available.'}</p>

              <ul className="product-specs">
                <li>Stock: {product.quantity > 0 ? 'In Stock' : 'Out of Stock'} ({product.quantity})</li>
                {product.colors?.length > 0 && <li>Colors: {product.colors.join(', ')}</li>}
                {product.sizes?.length > 0 && <li>Sizes: {product.sizes.join(', ')}</li>}
                <li>Label:{product.label}</li>
                <li>Promo:{product.promoCode || 'None'} ({product.promoDiscountPercent || 0}%)</li>
                {product.specifications && (
                  <li>
                    Specs:
                    <ul>
                      {product.specifications.split(',').map((spec, idx) => <li key={idx}>{spec.trim()}</li>)}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Adminproddetail;

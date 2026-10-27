import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserShield } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { encryptToken } from '../utils/securetoken';
import './Adminlogin.css';

const Adminlogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const API = process.env.REACT_APP_APIURL;
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    try {
      const res = await axios.post(`${API}/api/adminlogin`, formData);

      toast.success(res.data.message || 'Admin logged in successfully');

      const encrypted = await encryptToken(res.data.token);

      if (encrypted) {
        sessionStorage.setItem('adminToken', encrypted);
        window.dispatchEvent(new Event('adminLogin'));
        navigate('/admindashboard');
      } else {
        toast.error('Failed to encrypt admin token');
      }
    } catch (err) {
      const message = err.response?.data?.details || 'Invalid credentials';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">

        <div className="admin-logo-wrapper">
          <img
            src="/img/prime-logo.png"
            alt="Prime Logo"
            className="admin-logo"
          />
        </div>

        <h2 className="admin-login-title">
          <FaUserShield className="shield-icon" />
          Admin Login
        </h2>

        <p className="admin-login-subtitle">
          Secure access to Prime Shoes dashboard
        </p>

        <form className="admin-login-form" onSubmit={handleSubmit}>

          <div className="admin-input-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter admin email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="admin-input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="admin-login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

        </form>


      </div>
    </div>
  );
};

export default Adminlogin;
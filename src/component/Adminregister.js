import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserShield } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AdminRegister.css';

const Adminregister = () => {
  const [formData, setFormData] = useState({
    adminname: '',
    email: '',
    password: '',
  });

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
      const res = await axios.post(`${API}/api/adminregister`, formData);

      toast.success(res.data.message || 'Admin registered successfully');

      setFormData({
        adminname: '',
        email: '',
        password: '',
      });

      navigate('/adminlogin');

    } catch (err) {
      const message =
        err.response?.data?.details || 'Something went wrong';

      toast.error(message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-register-page">

      <div className="admin-register-card">

        <div className="admin-register-logo-wrapper">
          <img
            src="/img/prime-logo.png"
            alt="Prime Logo"
            className="admin-register-logo"
          />
        </div>

        <h2 className="admin-register-title">
          <FaUserShield className="admin-register-icon" />
          Admin Registration
        </h2>

        <p className="admin-register-subtitle">
          Create a secure admin account for dashboard access
        </p>

        <form
          className="admin-register-form"
          onSubmit={handleSubmit}
        >

          <div className="admin-register-input-group">
            <label>Admin Name</label>
            <input
              type="text"
              name="adminname"
              placeholder="Enter admin name"
              value={formData.adminname}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="admin-register-input-group">
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

          <div className="admin-register-input-group">
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
            className="admin-register-btn"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>

        </form>

        <p className="admin-register-footer">
          Already an admin?
          <Link
            to="/adminlogin"
            className="admin-register-link"
          >
            Login here
          </Link>
        </p>

      </div>

    </div>
  );
};

export default Adminregister;
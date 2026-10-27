import React, { useState, useContext } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { UserContext } from '../App';
import { decryptToken } from '../utils/securetoken';
import './Login.css'; // use same CSS as login page
import { Helmet } from 'react-helmet';

const Changepass = () => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false); // ✅ loading state

  const API = process.env.REACT_APP_APIURL;
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = form;

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setLoading(true); // start loading

    try {
      const stored = localStorage.getItem("token");
      if (!stored) throw new Error("You are not logged in.");

      const rawToken = await decryptToken(stored);

      const res = await fetch(`${API}/api/auth/changepassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${rawToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');

      toast.success("Password updated successfully. Please login again.");
      localStorage.removeItem("token");
      setUser(null);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false); // always reset loading
    }
  };

  return (
    <>
     <Helmet  >
    <title>Securely Change Your Password | Prime Shoes Phagwara</title>
    <meta
      name="description"
      content="Reach out to Prime Shoes for queries, support, or feedback. Fill out our contact form, call us, or visit our store in Phagwara, Punjab."
    />
    <meta
      name="keywords"
      content="Prime Shoes contact, customer support, feedback, queries, reach us, footwear support, online shopping help"
    />
  </Helmet>
    <div className="login-page">
      {/* Breadcrumb */}
      <div className="login-breadcrumb">
        <div className="container">
          <Link to="/">
            <FaHome style={{ marginRight: '8px', color: 'rgb(236, 108, 29)' }} /> 
            Home
          </Link>
          <span> / Change Password</span>
        </div>
      </div>

      {/* Change Password Section */}
      <section className="login-section">
        <div className="container login-container">
          <div className="login-card only-form">
            <div className="login-form">
              <div className="login-logo">
                <img src="/img/prime-logo.png" alt="Prime Shoes Logo" />
              </div>
              <h5>Change Password</h5>
              <form onSubmit={handleSubmit}>
                <input
                  type="password"
                  name="currentPassword"
                  placeholder="Current Password"
                  value={form.currentPassword}
                  onChange={handleChange}
                  required
                />
                <input
                  type="password"
                  name="newPassword"
                  placeholder="New Password"
                  value={form.newPassword}
                  onChange={handleChange}
                  required
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm New Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button 
                  type="submit" 
                  className="login-btn" 
                  disabled={loading} // disable while loading
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
              <p>
                Remembered your old password? <Link to="/login">Login here</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default Changepass;

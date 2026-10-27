import React, { useEffect, useState } from 'react';
import { FaLock, FaCheckCircle, FaUserShield, FaKey } from 'react-icons/fa';
import Adminsidebar from './Adminsidebar';
import Admintopnav from './Admintopnav';
import axios from 'axios';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode'; 
import { decryptToken } from '../utils/securetoken';
import './Adminchangepass.css'

const iconStyle = { marginRight: '8px', color: '#EC6C1D' };
const bulletStyle = { marginRight: '6px', color: '#EC6C1D', fontSize: '12px' };

const Adminchangepass = () => {
  const [formData, setFormData] = useState({
    email: '',
    oldPassword: '',
    newPassword: '',
  });
  const [adminName, setAdminName] = useState("Admin User");
  const API = process.env.REACT_APP_APIURL;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const encoded = sessionStorage.getItem('adminToken');
    if (encoded) {
      decryptToken(encoded)
        .then(token => {
          const decoded = jwtDecode(token);
          setAdminName(decoded.adminname || "Admin User");
        })
        .catch(err => {
          console.error("Token decryption failed", err);
          toast.error("Session expired. Please login again.");
          window.location.href = "/adminlogin";
        });
    }
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true); // start loading
  try {
    const res = await axios.post(`${API}/api/admin/changepassword`, formData);
    toast.success('Password changed successfully. Login with new password.');
    sessionStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    window.location.href = '/adminlogin';
  } catch (err) {
    const message = err.response?.data?.message || err.response?.data?.msg || 'Failed to change password';
    toast.error(message);
  } finally {
    setLoading(false); // stop loading
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
      <div className="admin-main-content" style={{ paddingTop: '80px' }}>
        {/* Top Navigation */}
        <Admintopnav adminName={adminName} handleLogout={handleLogout} />

        {/* Info + Form Section */}
        <section className="contact spad mt-4">
          <div className="container">
            <div className="row">
              {/* Left Info */}
              <div className="col-lg-6 col-md-6 mb-4">
                <div className="contact__content">
                  <div className="contact__address">
                    <h5>Admin Security Tips</h5>
                    <ul>
                      <li>
                        <h6><FaUserShield style={iconStyle} /> Strong Credentials</h6>
                        <ul>
                          <li><FaCheckCircle style={bulletStyle} /> Use a secure password</li>
                          <li><FaCheckCircle style={bulletStyle} /> Avoid sharing credentials</li>
                        </ul>
                      </li>
                      <li>
                        <h6><FaKey style={iconStyle} /> Regular Updates</h6>
                        <ul>
                          <li><FaCheckCircle style={bulletStyle} /> Change password periodically</li>
                          <li><FaCheckCircle style={bulletStyle} /> Use combinations of characters</li>
                        </ul>
                      </li>
                      <li>
                        <h6><FaLock style={iconStyle} /> Confidentiality</h6>
                        <ul>
                          <li><FaCheckCircle style={bulletStyle} /> Avoid saving passwords on browsers</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right Form */}
              <div className="col-lg-6 col-md-6">
                <div className="contact__form">
                  <h5>CHANGE ADMIN PASSWORD</h5>
                  <form onSubmit={handleSubmit}>
                    <input
                      type="email"
                      name="email"
                      placeholder="Admin Email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                    <input
                      type="password"
                      name="oldPassword"
                      placeholder="Current Password"
                      value={formData.oldPassword}
                      onChange={handleChange}
                      required
                    />
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="New Password"
                      value={formData.newPassword}
                      onChange={handleChange}
                      required
                    />
                   <button type="submit" className="site-btn" disabled={loading}>
  {loading ? 'Updating...' : 'Update Password'}
</button>

                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Adminchangepass;

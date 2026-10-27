import React, { useContext } from 'react';
import { 
  FaUserShield, FaUsers, FaShoppingCart, FaMoneyBill, FaBoxOpen, 
  FaExclamationTriangle, FaLock, FaSignOutAlt, FaUserPlus, FaBan, 
  FaTags
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import './Admindashboard.css';
import './Adminsidebar.css';
import { AdminContext } from './AdminContext';

const Adminsidebar = () => {
  const navigate = useNavigate();
  
  // ✅ Get adminName and handleLogout from context
  const { adminName, handleLogout } = useContext(AdminContext);

  const linkStyle = {
    color: 'inherit',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div className="admin-sidebar">
      <h4 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FaUserShield /> {adminName}
      </h4>
      <ul>
        <li>
          <Link to="/admindashboard" style={linkStyle}><FaShoppingCart />Dashboard</Link>
        </li>
        <li>
          <Link to="/adminorders" style={linkStyle}><FaShoppingCart /> View Orders</Link>
        </li>
        <li>
          <Link to="/adminsales" style={linkStyle}><FaMoneyBill /> View Sales</Link>
        </li>
        <li>
          <Link to="/adminreturnsandcancel" style={linkStyle}><FaBan /> Returns & Cancels</Link>
        </li>
        <li>
          <Link to="/manageproducts" style={linkStyle}><FaBoxOpen /> Manage Products</Link>
        </li>
        <li>
  <Link to="/managecoupons" style={linkStyle}>
    <FaTags /> Manage Coupons
  </Link>
</li>
        <li>
          <Link to="/adminproducts" style={linkStyle}><FaShoppingCart />View Products</Link>
        </li>
        <li>
          <Link to="/adminlowstock" style={linkStyle}><FaExclamationTriangle /> Low Stock</Link>
        </li>
        <li>
          <Link to="/adminusers" style={linkStyle}><FaUsers /> View Users</Link>
        </li>
        <li>
          <Link to="/adminchangepass" style={linkStyle}><FaLock /> Change Password</Link>
        </li>
        <li>
          <Link to="/addadmin" style={linkStyle}><FaUserPlus /> Add New Admin</Link>
        </li>
        <li
          onClick={handleLogout}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaSignOutAlt /> Logout
        </li>
      </ul>
    </div>
  );
};

export default Adminsidebar;

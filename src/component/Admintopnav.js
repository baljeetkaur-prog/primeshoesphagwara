import React, { useState, useContext } from 'react';
import './Admintopnav.css';
import { Link, useNavigate } from 'react-router-dom';
import { AdminContext } from './AdminContext';

const Admintopnav = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // Mobile menu state
  const navigate = useNavigate();
  const { adminName, handleLogout } = useContext(AdminContext);

  return (
    <header className="admin-topnav">
      <div className="logo">
        <img src="/img/prime-logo.png" alt="Logo" />
      </div>

      {/* Hamburger menu for small screens */}
 <div
  className="adminhamburger"
  onClick={() => setMenuOpen(!menuOpen)}
>
  {menuOpen ? '×' : '☰'}
</div>

      {/* Navigation links */}
      <nav className={`admin-nav ${menuOpen ? 'open' : ''}`}>
        <button onClick={() => navigate('/adminorders')}>Orders</button>
        <button onClick={() => navigate('/adminsales')}>Sales</button>
        <button onClick={() => navigate('/adminreturnsandcancel')}>Returns & Cancels</button>
        <button onClick={() => navigate('/adminlowstock')}>Low Stock Products</button>
        <button onClick={() => navigate('/adminproducts')}>Products</button>
      </nav>

      {/* User dropdown */}
      <div className="right-icons">
        <div
          className={`user-dropdown ${dropdownOpen ? 'open' : ''}`}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="avatar">{adminName.charAt(0)}</div>
          <span className="admin-name">{adminName}</span>

          <div className="dropdown">
            <Link to="/adminchangepass" href="/settings">Change Password</Link>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Admintopnav;

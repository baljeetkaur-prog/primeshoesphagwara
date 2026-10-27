// src/components/Offcanvas.jsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Offcanvas = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      const preloader = document.getElementById('preloder');
      if (preloader) {
        preloader.style.display = 'none';
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Preloader */}
      <div id="preloder">
        <div className="loader"></div>
      </div>

      {/* Offcanvas Menu */}
      <div className="offcanvas-menu-overlay"></div>
      <div className="offcanvas-menu-wrapper">
        <div className="offcanvas__close">+</div>

        <ul className="offcanvas__widget">
          {/* ✅ Search icon removed */}
          <li>
            <Link to="#"><span className="icon_heart_alt"></span><div className="tip">2</div></Link>
          </li>
          <li>
            <Link to="#"><span className="icon_bag_alt"></span><div className="tip">2</div></Link>
          </li>
        </ul>

        <div className="offcanvas__logo">
          <Link to="/"><img src="/img/logo.png" alt="Logo" /></Link>
        </div>

        <div id="mobile-menu-wrap"></div>

        <div className="offcanvas__auth">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </div>
    </>
  );
};

export default Offcanvas;

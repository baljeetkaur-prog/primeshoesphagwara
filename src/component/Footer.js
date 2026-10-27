import React from 'react';
import { FaHeart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import "./Footer.css"

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

const handleProtectedClick = (path) => {
  const token = localStorage.getItem("token");
  if (token) {
    navigate(path);
  } else {
    toast.info('Please login first');
    navigate('/login');
  }
};



  return (
    <footer className="footer">
      {/* Full-width background, centered inner content */}
      <div className="footer-inner">
        <div className="row">
          {/* About Section */}
          <div className="col-lg-3 col-md-6 col-sm-7">
            <div className="footer__about">
              <div className="footer__logo">
                <a href="/">
                  <img src="/img/prime-logo.png" alt="Prime Shoes Logo" />
                </a>
              </div>
              <p>
                Walk bold. Walk Prime. <br />
                Footwear that makes a statement.
              </p>
              <div className="footer__payment">
                <a
                  href="https://razorpay.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src="/img/razorpay.png"
                    alt="Razorpay"
                    style={{ height: '40px' }}
                  />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-lg-2 col-md-3 col-sm-5">
            <div className="footer__widget">
              <h6>Quick links</h6>
              <ul>
                <li><a href="/about">About</a></li>
                <li><a href="#" onClick={() => navigate('/contact')}>Contact</a></li>
                <li><a href="#" onClick={() => navigate('/faq')}>FAQ</a></li>
                <li><a href="#" onClick={() => navigate('/privacypolicy')}>Privacy Policy</a></li>
                <li><a href="#" onClick={() => navigate('/pricingpolicy')}>Pricing</a></li>
                <li><a href="#" onClick={() => navigate('/cancelrefundpolicy')}>Cancellation/Refund Policy</a></li>
                <li><a href="#" onClick={() => navigate('/termsconditions')}>Terms & Conditions</a></li>
              </ul>
            </div>
          </div>

          {/* Account Links */}
          <div className="col-lg-2 col-md-3 col-sm-4">
            <div className="footer__widget">
              <h6>Account</h6>
              <ul>
                <li><a href="#" onClick={() => handleProtectedClick('/')}>My Account</a></li>
<li><a href="#" onClick={() => handleProtectedClick('/orders')}>Orders Tracking</a></li>
<li><a href="#" onClick={() => handleProtectedClick('/cart')}>Checkout</a></li>

              </ul>
            </div>
          </div>

          {/* Store Info */}
          <div className="col-lg-2 col-md-4 col-sm-6">
            <div className="footer__widget">
              <h6>Store Info</h6>
              <p>Location: Phagwara, Punjab</p>
              <p>Mon–Sat: 10AM – 8PM</p>
              <p>Sunday: Closed</p>
              <p>Phone: +91-98765-43210</p>
            </div>
          </div>

          {/* Social */}
          <div className="col-lg-3 col-md-8 col-sm-8">
            <div className="footer__newslatter">
              <div className="footer__social">
                <a href="https://www.instagram.com/prime.shoes.phagwara" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-instagram" style={{ fontSize: '28px', color: '#E1306C' }}></i>
                </a>
                <a href="https://www.youtube.com/@primeshoesphg" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-youtube" style={{ fontSize: '28px', color: '#FF0000' }}></i>
                </a>
                <a href="https://www.facebook.com/primeshoesphagwara" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-facebook" style={{ fontSize: '28px', color: '#1877F2' }}></i>
                </a>
                <a href="https://www.snapchat.com/add/primeshoesphg" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-snapchat" style={{ fontSize: '28px', color: '#FFFC00' }}></i>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="row">
          <div className="col-lg-12">
            <div className="footer__copyright__text">
              <p>
                Copyright &copy; {currentYear} Prime Shoes. All rights reserved | Developed by{' '}
                <a href="https://socialsimba.com/" target="_blank" rel="noreferrer" style={{color:"#ff6a00", fontWeight:"600"}}>
                  Social Simba
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

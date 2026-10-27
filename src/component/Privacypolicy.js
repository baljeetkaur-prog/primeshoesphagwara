import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { Helmet } from 'react-helmet';

const iconStyle = { marginRight: '8px', color: '#ca1515' };

const Privacypolicy = () => {
  return (
    <>
          <Helmet>
        <title>Privacy Policy | Prime Shoes Phagwara</title>
        <meta 
          name="description" 
          content="Read the Privacy Policy of Prime Shoes in Phagwara. Learn how we collect, use, and protect your personal information while providing a safe shopping experience." 
        />
        <meta 
          name="keywords" 
          content="Prime Shoes Privacy Policy, personal data, data protection, shipping policy, refund policy, cancellation policy, Phagwara" 
        />
      </Helmet>
    <div>
      {/* Breadcrumb */}
<div className="custom-breadcrumb">
  <div className="breadcrumb-container">
    <div className="breadcrumb-links">
      <Link to="/"><i className="fa fa-home"></i> Home</Link>
      <span>Privacy Policy</span>
    </div>
  </div>
</div>

      {/* Privacy Policy Section */}
      <section className="contact spad" style={{borderBottom: "1px solid #000"}}>
        <div className="container">
          <div className="contact__content">
            <h5 style={{ color: '#000', fontWeight: '600' }}>Privacy Policy</h5>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              At <strong>Prime Shoes</strong>, we value your privacy and are committed to protecting your personal information.
              This policy outlines how we collect, use, disclose, and safeguard your data when you use our website or services.
            </p>

            <p style={{ color: '#000', lineHeight: '1.8' }}>
              By accessing Prime Shoes, you agree to the practices described in this policy. If you do not agree, please refrain
              from using the site.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Information We Collect</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              We collect information you voluntarily provide such as your name, email, phone number, address, and payment details.
              We also automatically collect technical data like your IP address, browser type, and browsing behavior through
              cookies and other tracking technologies.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>How We Use Your Information</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              Your information helps us fulfill your orders, send updates, improve our services, and provide a personalized
              shopping experience. It is also used for customer support, fraud prevention, and marketing purposes—only with your
              consent.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Sharing of Information</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              We may share your information with trusted partners like payment gateways and logistics providers. We do not sell or
              rent your personal data. Legal compliance may require sharing information with authorities or advisors.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Data Security</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              We follow strict security measures to protect your data. This includes encryption, secure servers, and regular audits.
              However, no online transmission is ever 100% secure.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Cookies</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              We use cookies to enhance your browsing experience. Cookies help us remember your preferences, analyze site traffic,
              and deliver personalized content. You may disable cookies via your browser settings.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Your Rights</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              You have the right to access, correct, or delete your data. You may also opt out of marketing emails at any time. For
              any data-related requests, contact our support team.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Order, Refund & Cancellation Policy</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              <strong>Shipping Time:</strong> Orders are typically shipped within 0 to 7 days.<br />
              <strong>Refund Time:</strong> Approved refunds are processed within 3 to 5 business days.<br />
              <strong>Cancellation:</strong> Orders may be cancelled only on the same day of placement.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Grievance Officer</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              In accordance with the Information Technology Act 2000, our designated Grievance Officer will address your concerns
              within 30 days.
              <br /><br />
              <strong>Name:</strong> Amandeep Singh<br />
              <strong>Email:</strong> cool.aman41@yahoo.com<br />
              <strong>Phone:</strong> +91 99882 06681
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Policy Updates</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              We may update this Privacy Policy from time to time. Changes will be posted here with a new effective date.
              Please review periodically for the latest updates.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Contact Us</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              If you have any questions regarding our privacy practices, please contact us at:
              <br /><br />
              <strong>Email:</strong> cool.aman41@yahoo.com<br />
              <strong>Address:</strong> Gowshala Road, Phagwara, Kapurthala, Punjab, 144401
            </p>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default Privacypolicy;

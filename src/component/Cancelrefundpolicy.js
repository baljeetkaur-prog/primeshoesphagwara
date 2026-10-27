import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { Helmet } from 'react-helmet';

const iconStyle = { marginRight: '8px', color: '#ca1515' };

const Cancelrefundpolicy = () => {
  return (
    <>
    <Helmet>
        <title>Cancellation & Refund Policy | Prime Shoes Phagwara</title>
        <meta
          name="description"
          content="Read the Cancellation & Refund Policy of Prime Shoes in Phagwara. Learn how to cancel orders, request refunds, and understand returns and exchanges for a smooth shopping experience."
        />
        <meta
          name="keywords"
          content="Prime Shoes cancellation policy, refund policy, returns, exchanges, order cancellation, Phagwara"
        />
      </Helmet>
    <div>
      {/* Breadcrumb */}
 <div className="custom-breadcrumb">
   <div className="breadcrumb-container">
     <div className="breadcrumb-links">
       <Link to="/"><i className="fa fa-home"></i> Home</Link>
       <span>Cancellation & Refund Policy</span>
     </div>
   </div>
 </div>

      {/* Cancellation & Refund Policy Section */}
      <section className="contact spad" style={{borderBottom:"1px solid #000"}}>
        <div className="container">
          <div className="contact__content">
            <h5 style={{ color: '#000', fontWeight: '600' }}>Cancellation & Refund Policy</h5>
            
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              At <strong>Prime Shoes</strong>, customer satisfaction is our top priority. If you need to cancel your order or request a refund,
              please review our policy below.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Order Cancellation</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              Orders can be cancelled only on the same day of placement before the order is dispatched.
              To cancel an order, please contact our support team as soon as possible.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Refund Process</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              Once we receive a returned product in its original condition, we will process the refund within 3 to 5 business days.
              Refunds will be credited to the original payment method.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Return & Exchange</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              Returns or exchanges are accepted within 7 days of delivery for defective or incorrect items.
              Please ensure the product is unused and in original packaging.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Non-refundable Items</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              Products damaged due to customer misuse or wear and tear are not eligible for refunds.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Contact Us</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              For cancellation or refund requests, please reach out to:
              <br /><br />
              <strong>Email:</strong> cool.aman41@yahoo.com<br />
              <strong>Phone:</strong> +91 99882 06681
            </p>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default Cancelrefundpolicy;

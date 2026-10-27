import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { Helmet } from 'react-helmet';

const iconStyle = { marginRight: '8px', color: '#ca1515' };

const Pricingpolicy = () => {
  return (
    <>
      <Helmet>
        <title>Pricing Policy | Prime Shoes Phagwara</title>
        <meta 
          name="description" 
          content="Learn about the pricing policy of Prime Shoes in Phagwara. Transparent pricing, discounts, shipping charges, and accepted payment methods for a seamless shopping experience." 
        />
        <meta 
          name="keywords" 
          content="Prime Shoes Pricing Policy, product prices, discounts, shipping charges, payment methods, Phagwara" 
        />
      </Helmet>
    <div>
      {/* Breadcrumb */}
 <div className="custom-breadcrumb">
   <div className="breadcrumb-container">
     <div className="breadcrumb-links">
       <Link to="/"><i className="fa fa-home"></i> Home</Link>
       <span>Pricing</span>
     </div>
   </div>
 </div>

      {/* Pricing Section */}
      <section className="contact spad" style={{borderBottom: '1px solid #000'}}>
        <div className="container">
          <div className="contact__content">
            <h5 style={{ color: '#000', fontWeight: '600' }}>Pricing</h5>
            
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              At <strong>Prime Shoes</strong>, we strive to offer the best quality products at competitive prices.
              Our pricing reflects the quality, design, and craftsmanship that goes into each product.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Price Transparency</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              All prices listed on our website are inclusive of applicable taxes and fees unless otherwise stated.
              Prices are subject to change without prior notice.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Discounts and Promotions</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              We occasionally offer discounts and promotional offers.
              Discounted prices and promo codes will be clearly displayed on the product page and during checkout.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Shipping Charges</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              Shipping charges, if any, are calculated based on delivery location and product weight and will be displayed
              at checkout.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Payment Methods</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              We accept multiple payment methods including credit/debit cards, UPI, net banking, and cash on delivery (COD).
            </p>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default Pricingpolicy;

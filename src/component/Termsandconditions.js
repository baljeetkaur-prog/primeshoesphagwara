import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { Helmet } from 'react-helmet';

const iconStyle = { marginRight: '8px', color: '#ca1515' };

const Termsandconditions = () => {
  return (
    <>
     <Helmet>
        <title>Terms & Conditions | Prime Shoes Phagwara</title>
        <meta
          name="description"
          content="Read the Terms & Conditions of Prime Shoes in Phagwara. Learn about website usage, order acceptance, intellectual property, and more for a safe shopping experience."
        />
        <meta
          name="keywords"
          content="Prime Shoes terms and conditions, website usage, order policy, intellectual property, liability, Phagwara"
        />
      </Helmet>
    <div>
      {/* Breadcrumb */}
 <div className="custom-breadcrumb">
   <div className="breadcrumb-container">
     <div className="breadcrumb-links">
       <Link to="/"><i className="fa fa-home"></i> Home</Link>
       <span>Terms & Conditions</span>
     </div>
   </div>
 </div>

      {/* Terms & Conditions Section */}
      <section className="contact spad" style={{borderBottom: '1px solid #000'}}>
        <div className="container">
          <div className="contact__content">
            <h5 style={{ color: '#000', fontWeight: '600' }}>Terms & Conditions</h5>
            
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              By accessing and using <strong>Prime Shoes</strong>, you agree to comply with and be bound by the following terms and conditions.
              Please read them carefully.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Use of Website</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              You agree to use the website for lawful purposes only and not engage in any activities that may harm or disrupt the
              website or its users.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Product Information</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              We strive to provide accurate product information including pricing, descriptions, and images.
              However, we do not guarantee complete accuracy and reserve the right to correct errors.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Order Acceptance</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              All orders placed are subject to acceptance and availability.
              We reserve the right to refuse or cancel any order for any reason.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Intellectual Property</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              All content on the website, including text, graphics, logos, and images, is the property of Prime Shoes or its licensors.
              Unauthorized use is prohibited.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Limitation of Liability</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              Prime Shoes shall not be liable for any damages arising from the use or inability to use the website or products.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Changes to Terms</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              We reserve the right to modify these terms at any time without prior notice.
              Continued use of the website constitutes acceptance of the updated terms.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Governing Law</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              These terms shall be governed by and construed in accordance with the laws of India.
            </p>

            <h6 style={{ color: '#000', fontWeight: '600' }}>Contact Information</h6>
            <p style={{ color: '#000', lineHeight: '1.8' }}>
              For any questions regarding these terms, please contact us at:
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

export default Termsandconditions;

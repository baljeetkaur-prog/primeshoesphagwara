import React from 'react';
import Instagram from './Instagram';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const Contact = () => {
  return (
    <>
     <Helmet>
    <title>Get in Touch with Prime Shoes – Ask Questions, Feedback, or Support</title>
    <meta
      name="description"
      content="Reach out to Prime Shoes for queries, support, or feedback. Fill out our contact form, call us, or visit our store in Phagwara, Punjab."
    />
    <meta
      name="keywords"
      content="Prime Shoes contact, customer support, feedback, queries, reach us, footwear support, online shopping help"
    />
  </Helmet>
      {/* Breadcrumb Section */}
<div className="custom-breadcrumb">
  <div className="breadcrumb-container">
    <div className="breadcrumb-links">
      <Link to="/"><i className="fa fa-home"></i> Home</Link>
      <span>Contact</span>
    </div>
  </div>
</div>

      {/* Contact Section */}
      <section className="contact spad" style={{borderBottom: '1px solid #000'}}>
        <div className="container">
          <div className="row">
            {/* Contact Info and Form */}
            <div className="col-lg-6 col-md-6">
              <div className="contact__content">
                <div className="contact__address">
                  <h5>Contact Info</h5>
                  <ul>
                    <li>
                      <h6><i className="fa fa-map-marker"></i> Address</h6>
                      <p>6QCC+PRR, Gaushala Bazar In Rd, Phagwara, Punjab 144401</p>
                    </li>
                    <li>
                      <h6><i className="fa fa-phone"></i> Phone</h6>
                      <p><span>+91 99882 06681</span></p>
                    </li>
                    <li>
                      <h6><i className="fa fa-headphones"></i> Support</h6>
                      <p><a href="mailto:baljeetkor6@gmail.com">cool.aman41@yahoo.com</a></p>
                    </li>
                  </ul>
                </div>

                <div className="contact__form">
                  <h5>SEND MESSAGE</h5>
                  <form 
                    action="https://formspree.io/f/xqaladzy" 
                    method="POST"
                  >
                    <input type="text" name="name" placeholder="Name" required />
                    <input type="email" name="email" placeholder="Email" required />
                    <input type="text" name="website" placeholder="Contact" />
                    <textarea name="message" placeholder="Message" required></textarea>
                    <button type="submit" className="site-btn">Send Message</button>
                  </form>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="col-lg-6 col-md-6">
              <div className="contact__map">
                <iframe
                  title="Prime Shoes Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3411.9695616622353!2d75.76914417543868!3d31.221572674352092!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391af4e7d3533faf%3A0xf698eb6c3c49f9e8!2sPrime%20Shoes!5e0!3m2!1sen!2sin!4v1752832373362!5m2!1sen!2sin"
                  width="100%"
                  height="780"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;

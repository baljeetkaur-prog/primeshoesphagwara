import React from 'react';
import { FaCar, FaMoneyBill, FaHeadset, FaLifeRing } from 'react-icons/fa';
import './Servicesection.css';

const Servicesection = () => {
  const services = [
    { icon: <FaCar />, title: 'Free Shipping', desc: 'On all orders over ₹1000' },
    { icon: <FaMoneyBill />, title: 'Money Back Guarantee', desc: 'Refunds for defective goods' },
    { icon: <FaLifeRing />, title: 'Online Support 24/7', desc: 'Get help anytime you need' },
    { icon: <FaHeadset />, title: 'Secure Payment', desc: '100% safe and encrypted' },
  ];

  return (
    <section className="fservice-section">
      <div className="fservice-container">
        {services.map((service, index) => (
          <div className="fservice-card text-center" key={index}>
            <div className="fservice-icon-wrapper mb-3">{service.icon}</div>
            <h6 className="fservice-title">{service.title}</h6>
            <p className="fservice-desc">{service.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Servicesection;

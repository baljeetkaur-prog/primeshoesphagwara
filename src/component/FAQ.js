import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaHome,
  FaQuestionCircle,
  FaLightbulb,
  FaChevronCircleDown,
  FaPlusCircle,
  FaMinusCircle,
} from 'react-icons/fa';
import Instagram from './Instagram';
import './FAQ.css';
import { Helmet } from 'react-helmet';

const iconStyle = { marginRight: '8px', color: '#EC6C1D' };
const bulletStyle = { marginRight: '6px', color: '#EC6C1D', fontSize: '14px' };
const toggleIconStyle = { marginRight: '10px', fontSize: '16px', color: '#EC6C1D' };

const faqData = [
  {
    question: 'What is your return policy?',
    answer: 'We offer a 3–5 day return policy for unused items in original packaging.',
  },
  {
    question: 'How long does delivery take?',
    answer: 'Orders are delivered within 0–7 business days across India.',
  },
  {
    question: 'Do you ship internationally?',
    answer: 'Currently, we ship only within India. International shipping is coming soon.',
  },
  {
    question: 'How do I contact support?',
    answer: 'You can email us at cool.aman41@yahoo.com or use the contact form.',
  },
];


const FAQ = () => {
  const [openIndexes, setOpenIndexes] = useState([]);

  const toggleFAQ = (index) => {
    setOpenIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  return (
    <>    
    <Helmet>
    <title>Frequently Asked Questions | Prime Shoes Phagwara</title>
<meta name="description" content="Find answers to common questions about Prime Shoes, including shipping, returns, order process, and support in Phagwara. Save time and get help quickly." />
<meta name="keywords" content="Prime Shoes FAQ, shipping policy, return policy, order process, customer support, Phagwara, online shopping questions" />
  </Helmet>
    <div>
      {/* Breadcrumb Section */}
<div className="custom-breadcrumb">
  <div className="breadcrumb-container">
    <div className="breadcrumb-links">
      <Link to="/"><i className="fa fa-home"></i> Home</Link>
      <span>FAQ</span>
    </div>
  </div>
</div>

      {/* FAQ Section */}
      <section className="contact spad" style={{borderBottom: '1px solid #000'}}>
        <div className="container">
          <div className="row">
            {/* Left - Why FAQs */}
            <div className="col-lg-6 col-md-6">
              <div className="contact__content">
                <div className="contact__address">
                  <h5>Why Read Our FAQs?</h5>
                  <ul>
                    <li>
                      <h6><FaQuestionCircle style={iconStyle} /> Quick Help</h6>
                      <ul>
                        <li><FaChevronCircleDown style={bulletStyle} /> Answers to common questions</li>
                        <li><FaChevronCircleDown style={bulletStyle} /> Save time before contacting support</li>
                      </ul>
                    </li>
                    <li>
                      <h6><FaLightbulb style={iconStyle} /> Learn More</h6>
                      <ul>
                        <li><FaChevronCircleDown style={bulletStyle} /> How our process works</li>
                        <li><FaChevronCircleDown style={bulletStyle} /> Understand shipping, returns & more</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right - Collapsible FAQs */}
            <div className="col-lg-6 col-md-6">
              <div className="contact__form">
                <h5>Frequently Asked Questions</h5>
                {faqData.map((faq, index) => {
                  const isOpen = openIndexes.includes(index);
                  return (
                    <div
                      key={index}
                      className={`faq__toggle-item ${isOpen ? 'open' : ''}`}
                    >
                      <div
                        className="faq__toggle-header"
                        onClick={() => toggleFAQ(index)}
                      >
                        {isOpen ? (
                          <FaMinusCircle style={toggleIconStyle} />
                        ) : (
                          <FaPlusCircle style={toggleIconStyle} />
                        )}
                        <span>{faq.question}</span>
                      </div>
                      <div className="faq__toggle-body">
                        {faq.answer}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default FAQ;

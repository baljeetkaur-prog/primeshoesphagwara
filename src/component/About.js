import React, { useEffect } from 'react';
import Instagram from './Instagram';
import './About.css'; // Still needed for spacing tweaks only
import { Link } from 'react-router-dom';

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* Breadcrumb Section */}
  <div className="custom-breadcrumb">
  <div className="breadcrumb-container">
    <div className="breadcrumb-links">
      <Link to="/"><i className="fa fa-home"></i> Home</Link>
      <span>About</span>
    </div>
  </div>
</div>

      {/* About Section */}
     <section className="contact spad about-section-bottom-fix" style={{ paddingTop: '30px' , borderBottom: '1px solid #000'}}>

        <div className="container">
          <div className="row align-items-center">
            {/* About Text */}
            <div className="col-lg-6 col-md-6">
              <div className="contact__content">
                <div className="contact__address">
                  <h5>Our Story</h5>
                  <p>
                    Founded in the heart of Punjab, <strong>Prime Shoes</strong> is a homegrown
                    brand born out of a passion for stylish, durable, and affordable footwear.
                    From humble beginnings in Phagwara, we’ve grown into a trusted name with a focus
                    on craftsmanship, comfort, and quality.
                  </p>
                </div>

                <div className="contact__address mt-4">
                  <h5>Why Choose Us</h5>
                  <ul>
                    <li>✔ Premium quality shoes at reasonable prices</li>
                    <li>✔ Handcrafted comfort & modern design</li>
                    <li>✔ Dedicated customer support</li>
                    <li>✔ Fast & reliable delivery</li>
                  </ul>
                </div>
              </div>
            </div>

   <div className="col-lg-6 col-md-6 position-relative">
  <div
    style={{
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      padding: '10px',
    }}
    className="shadow"
  >
    {/* Clear Image */}
    <img
      src="/img/primeshoes.png"
      alt="Prime Shoes Showcase"
      className="img-fluid w-100"
      style={{
        maxHeight: '550px',
        width: '100%',
        objectFit: 'cover',
        borderRadius: '12px',
        filter: 'brightness(1.05)', // slightly brighter
      }}
    />

    {/* Light Glass Overlay Box */}
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        transform: 'translateY(-50%)',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.35)', // light frosted white
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '25px 40px',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        borderTop: '1px solid rgba(255,255,255,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
        color: '#111',
        borderRadius: '0',
      }}
    >
      <h5
        className="mb-2 fw-bold"
        style={{
          fontSize: '22px',
          letterSpacing: '1px',
          color: 'black',
          fontWeight: 'bold'
        }}
      >
        Visit Us In-Store
      </h5>
      <p
        style={{
          fontSize: '16px',
          margin: 0,
          color: '#333',
        }}
      >
        Step into comfort, style, and tradition – Only at Prime Shoes.
      </p>
    </div>
  </div>
</div>

          </div>
        </div>
      </section>

    </>
  );
};

export default About;

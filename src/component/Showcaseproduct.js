import React from "react";
import { Link } from "react-router-dom"; // import Link
import "./Showcaseproduct.css";

export default function Showcaseproduct() {
  return (
    <section className="feature-showcase" role="region" aria-label="Luxury Footwear Highlight">
      <div className="feature-showcase__container">
        
        {/* Text Block */}
        <div className="feature-showcase__content">
          <h5 className="feature-showcase__tagline">Step Into Distinction</h5>
          <h1 className="feature-showcase__heading">Prime Shoes</h1>
          <p className="feature-showcase__description">
            Discover our signature footwear line where craftsmanship meets comfort. 
            Every pair is a balance of artistry, premium textures, and timeless 
            sophistication — designed for those who demand more from every step. 
          </p>
          <Link to="/products" className="feature-showcase__cta">
            Explore Collection
          </Link>
        </div>

        {/* Image Block */}
        <div className="feature-showcase__visual">
          <img
            className="feature-showcase__image"
            src="/img/showcaseproduct.jpg"
            alt="Luxury premium shoe display"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
}
